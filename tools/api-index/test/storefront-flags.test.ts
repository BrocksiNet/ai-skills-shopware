// Storefront `{% if feature() %}` flag-state tests (descoped WP C).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { diffSnapshots, isBreak } from '../src/api-diff.ts';
import { factsFor, Lookup } from '../src/facts.ts';
import { twigCondition, twigTemplateStates } from '../src/flag-state.ts';
import type { Item, Snapshot } from '../src/model.ts';
import { describe } from '../src/report.ts';
import { STOREFRONT_VIEWS, templateItems } from '../src/storefront.ts';
import { mergeSnapshots } from '../src/timeline.ts';

function snapshot(ref: string, items: Item[]): Snapshot {
  return { schema: 1, generator: 'test', ref, sha: `sha-${ref}`, builtAt: '2026-11-26T00:00:00Z', failed: [], items };
}

test('twigCondition evaluates feature() checks, negation, and/or combinators', () => {
  assert.deepEqual(twigCondition("feature('v6.8.0.0')"), {
    whenTrue: { from: 'v6.8.0' },
    whenFalse: { until: 'v6.8.0' },
  });
  assert.deepEqual(twigCondition("not feature('V6_8_0_0')"), {
    whenTrue: { until: 'v6.8.0' },
    whenFalse: { from: 'v6.8.0' },
  });
  assert.deepEqual(twigCondition("!feature('ACCESSIBILITY_TWEAKS')"), {
    whenTrue: { until: 'ACCESSIBILITY_TWEAKS' },
    whenFalse: { from: 'ACCESSIBILITY_TWEAKS' },
  });
  assert.deepEqual(twigCondition("feature('v6.8.0.0') and showShipping"), {
    whenTrue: { from: 'v6.8.0' },
    whenFalse: {},
  });
  assert.deepEqual(twigCondition("feature('v6.8.0.0') or legacyMode"), { whenTrue: {}, whenFalse: {} });
});

test('Storefront Twig blocks take flag states from {% if feature() %} / {% else %} chains', () => {
  const twig = `{% block cart_wrapper %}
    {% if feature('v6.8.0.0') %}
        {% block cart_new_add %}<div>new</div>{% endblock %}
        {% block cart_shared %}<span>v2</span>{% endblock %}
    {% else %}
        {% block cart_old_add %}<div>old</div>{% endblock %}
        {% block cart_shared %}<span>v1</span>{% endblock %}
    {% endif %}
    {% if not feature('CHECKOUT_V2') %}
        {% block cart_legacy_notice %}<p>legacy</p>{% endblock %}
    {% elseif ready %}
        {% block cart_v2_notice %}<p>v2</p>{% endblock %}
    {% endif %}
{% endblock %}`;

  const states = twigTemplateStates(twig);
  assert.deepEqual(Object.fromEntries(states), {
    cart_new_add: { from: 'v6.8.0' },
    cart_old_add: { until: 'v6.8.0' },
    cart_legacy_notice: { until: 'CHECKOUT_V2' },
    cart_v2_notice: { from: 'CHECKOUT_V2' },
  });

  const file = `${STOREFRONT_VIEWS}/page/checkout/cart/index.html.twig`;
  const items = templateItems(twig, file);
  const byId = new Map(items.map((item) => [item.id, item]));
  const baseId = 'storefront:@Storefront/storefront/page/checkout/cart/index.html.twig';
  assert.deepEqual(byId.get(`${baseId}#cart_new_add`)?.flags, { from: 'v6.8.0' });
  assert.deepEqual(byId.get(`${baseId}#cart_old_add`)?.flags, { until: 'v6.8.0' });
  assert.deepEqual(byId.get(`${baseId}#cart_shared`)?.flags, {});
});

test('Storefront flag-gated block transition is announced in api-diff and reported in api-facts', () => {
  const file = `${STOREFRONT_VIEWS}/page/checkout/cart/index.html.twig`;
  const v66 = templateItems('{% block cart_old_add %}<div>old</div>{% endblock %}', file);
  const v67 = templateItems(
    "{% if feature('v6.8.0.0') %}{% block cart_new_add %}<div>new</div>{% endblock %}{% else %}{% block cart_old_add %}<div>old</div>{% endblock %}{% endif %}",
    file,
  );
  const v68 = templateItems('{% block cart_new_add %}<div>new</div>{% endblock %}', file);

  const first = diffSnapshots(snapshot('v6.6.0.0', v66), snapshot('v6.7.0.0', v67), ['storefront']);
  assert.equal(first.changes.filter((change) => isBreak(change)).length, 0);
  const [announced] = first.changes;
  assert.ok(announced !== undefined);
  assert.equal(announced.kind, 'deprecated');
  assert.equal(announced.detail, 'gone with the v6.8.0 flag on');

  const second = diffSnapshots(snapshot('v6.7.0.0', v67), snapshot('v6.8.0.0', v68), ['storefront']);
  assert.equal(second.changes.filter((change) => isBreak(change)).length, 0);
  assert.equal(second.changes[0]?.announced, true);

  const lookup = new Lookup(mergeSnapshots([snapshot('v6.6.0.0', v66), snapshot('v6.7.0.0', v67)]));
  const baseId = 'storefront:@Storefront/storefront/page/checkout/cart/index.html.twig';
  const facts = factsFor(lookup, `${baseId}#cart_old_add`, 'block', ['6.6.0.0', '6.7.0.0']);
  const flagOff = facts.find((fact) => fact.kind === 'flag-off');
  assert.ok(flagOff !== undefined);
  assert.match(describe(flagOff), /^only with the v6\.8\.0 flag off in 6\.7\.0\.0$/u);
});
