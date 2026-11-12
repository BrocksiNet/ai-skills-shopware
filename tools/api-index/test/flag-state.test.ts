// Feature flag states of admin items (plan WP C step 1). The template is
// shaped like core PR 17339, which moved sw-tabs to mt-tabs behind the
// v6.8.0.0 flag and kept the old blocks in the `v-else`.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ADMIN_SRC, componentItems, registrations } from '../src/admin.ts';
import { diffSnapshots, isBreak } from '../src/api-diff.ts';
import { flagMarker, templateCondition, templateStates } from '../src/flag-state.ts';
import type { Item, Snapshot } from '../src/model.ts';
import { describe } from '../src/report.ts';
import { itemAt, mergeSnapshots, snapshotAt } from '../src/timeline.ts';

const TABS = `{% block sw_renderer %}
<div class="sw-renderer">
    <template v-if="variant === 'tabs'">
        <template v-if="feature.isActive('v6.8.0.0')">
            {% block sw_renderer_mt_tabs %}
            <mt-tabs :items="tabs" />
            {% endblock %}
        </template>
        <template v-else>
            {% block sw_renderer_tabs %}
            <sw-tabs position-identifier="sw-renderer">
                <template #default="{ active }">{% block sw_renderer_tabs_item %}{% endblock %}</template>
            </sw-tabs>
            {% endblock %}
        </template>
    </template>
    {% block sw_renderer_footer %}<footer>
        <slot name="footer"></slot>
    </footer>{% endblock %}
</div>
{% endblock %}`;

test('flag names become version markers; other flags keep their name', () => {
  assert.equal(flagMarker('v6.8.0.0'), 'v6.8.0');
  assert.equal(flagMarker('V6_8_0_0'), 'v6.8.0');
  assert.equal(flagMarker('DOCUMENT_GENERATION_REWORK'), 'DOCUMENT_GENERATION_REWORK');
});

test('a condition implies a state when true, and when false only for a lone check', () => {
  assert.deepEqual(templateCondition("feature.isActive('v6.8.0.0')"), {
    whenTrue: { from: 'v6.8.0' },
    whenFalse: { until: 'v6.8.0' },
  });
  assert.deepEqual(templateCondition("!feature.isActive('V6_8_0_0')"), {
    whenTrue: { until: 'v6.8.0' },
    whenFalse: { from: 'v6.8.0' },
  });
  assert.deepEqual(templateCondition("feature.isActive('v6.8.0.0') && mailPreview"), {
    whenTrue: { from: 'v6.8.0' },
    whenFalse: {},
  });
  assert.deepEqual(templateCondition("feature.isActive('v6.8.0.0') || legacy"), { whenTrue: {}, whenFalse: {} });
});

test('blocks under a v-if take its state, blocks under the v-else the opposite', () => {
  const states = templateStates(TABS);
  assert.deepEqual(Object.fromEntries(states.blocks), {
    sw_renderer_mt_tabs: { from: 'v6.8.0' },
    sw_renderer_tabs: { until: 'v6.8.0' },
    sw_renderer_tabs_item: { until: 'v6.8.0' },
  });
  // The footer sits after the closed chain: both states have it.
  assert.equal(states.slots.size, 0);
});

test('v-else-if chains, self-closing and void elements, and a plain sibling that ends the chain', () => {
  const states = templateStates(`<div>
    <p v-if="!feature.isActive('METEOR_TEXT_EDITOR')">{% block old_editor %}{% endblock %}</p>
    <p v-else-if="ready">{% block new_editor_ready %}{% endblock %}</p>
    <input v-else>
    <br>
    <p v-else>{% block not_in_chain %}{% endblock %}</p>
    <span v-if="feature.isActive('v6.8.0.0')"><mt-icon name="x" /><slot name="icon"></slot></span>
    <span v-else><slot name="icon"></slot><slot name="legacy"></slot></span>
</div>`);
  assert.deepEqual(Object.fromEntries(states.blocks), {
    old_editor: { until: 'METEOR_TEXT_EDITOR' },
    new_editor_ready: { from: 'METEOR_TEXT_EDITOR' },
  });
  // `icon` exists in both branches; `legacy` only with the flag off.
  assert.deepEqual(Object.fromEntries(states.slots), { legacy: { until: 'v6.8.0' } });
});

const FILES = new Map([
  [
    `${ADMIN_SRC}/module/sw-product/index.js`,
    [
      "Shopware.Component.register('sw-product-list', () => import('./sw-product-list'));",
      "if (!Shopware.Feature.isActive('v6.8.0.0')) {",
      "    Shopware.Component.register('sw-product-settings-mode', () => import('./sw-product-settings-mode'));",
      '} else {',
      "    Shopware.Component.register('sw-product-mode', () => import('./sw-product-mode'));",
      '}',
    ].join('\n'),
  ],
  [
    `${ADMIN_SRC}/module/sw-product/sw-product-list/index.js`,
    "import template from './t.html.twig';\nexport default { template };",
  ],
  [`${ADMIN_SRC}/module/sw-product/sw-product-list/t.html.twig`, TABS],
  [`${ADMIN_SRC}/module/sw-product/sw-product-settings-mode/index.js`, 'export default { methods: { run() {} } };'],
  [`${ADMIN_SRC}/module/sw-product/sw-product-mode/index.js`, 'export default {};'],
]);

function items(): Item[] {
  const paths = new Set(FILES.keys());
  const [path, code] = [...FILES][0] ?? ['', ''];
  return registrations(code, path, paths).flatMap((registration) =>
    componentItems(registration, (file) => FILES.get(file)),
  );
}

const byId = (list: Item[], id: string): Item | undefined => list.find((item) => item.id === id);

test('admin items carry the markers: components from the script, blocks and slots from the template', () => {
  const list = items();
  assert.deepEqual(byId(list, 'admin:sw-product-list')?.flags, {});
  assert.deepEqual(byId(list, 'admin:sw-product-settings-mode')?.flags, { until: 'v6.8.0' });
  assert.deepEqual(byId(list, 'admin:sw-product-mode')?.flags, { from: 'v6.8.0' });
  assert.deepEqual(byId(list, 'admin:sw-product-list#sw_renderer_tabs')?.flags, { until: 'v6.8.0' });
  assert.deepEqual(byId(list, 'admin:sw-product-list#sw_renderer_mt_tabs')?.flags, { from: 'v6.8.0' });
  assert.deepEqual(byId(list, 'admin:sw-product-list#sw_renderer_footer')?.flags, {});
});

function snapshot(ref: string, list: Item[]): Snapshot {
  return {
    schema: 1,
    generator: 'test',
    ref,
    sha: `sha-${ref}`,
    builtAt: '2026-11-12T00:00:00Z',
    failed: [],
    items: list,
  };
}

const block = (name: string, flags: Item['flags'] = {}): Item => ({
  id: `admin:sw-product-list#${name}`,
  kind: 'block',
  file: 't.html.twig',
  signature: 'sw_renderer',
  flags,
});

test('api-diff: a block put behind the flag is announced; removing it later is no break', () => {
  const before = snapshot('a', [block('sw_renderer_tabs')]);
  const gated = snapshot('b', [
    block('sw_renderer_tabs', { until: 'v6.8.0' }),
    block('sw_renderer_mt_tabs', { from: 'v6.8.0' }),
  ]);
  const shipped = snapshot('c', [block('sw_renderer_mt_tabs')]);
  const first = diffSnapshots(before, gated, ['admin']).changes;
  assert.deepEqual(
    first.map((change) => `${change.kind} ${change.id} ${change.detail}`),
    ['deprecated admin:sw-product-list#sw_renderer_tabs gone with the v6.8.0 flag on'],
  );
  const second = diffSnapshots(gated, shipped, ['admin']).changes;
  assert.deepEqual(
    second.map((change) => [change.kind, change.id, change.announced]),
    [['removed', 'admin:sw-product-list#sw_renderer_tabs', true]],
  );
  assert.equal([...first, ...second].filter((change) => isBreak(change)).length, 0);
});

test('the timeline keeps the markers per release', () => {
  const timeline = mergeSnapshots([
    snapshot('v6.7.0.0', [block('sw_renderer_tabs')]),
    snapshot('v6.7.1.0', [block('sw_renderer_tabs', { until: 'v6.8.0' })]),
  ]);
  const [item] = timeline.items;
  assert.ok(item);
  assert.equal(itemAt(timeline, item, '6.7.0.0').values.until, undefined);
  assert.equal(itemAt(timeline, item, '6.7.1.0').values.until, 'v6.8.0');
  assert.deepEqual(snapshotAt(timeline, 'v6.7.1.0')?.items[0]?.flags, { until: 'v6.8.0' });
});

test('facts name the flag state', () => {
  const releases: [string, string][] = [['6.7.1.0', '6.7.1.0']];
  assert.match(
    describe({ target: 'x', kind: 'flag-off', value: 'v6.8.0', releases }),
    /^only with the v6\.8\.0 flag off in /u,
  );
  assert.match(
    describe({ target: 'x', kind: 'flag-on', value: 'v6.8.0', releases }),
    /^only with the v6\.8\.0 flag on in /u,
  );
});
