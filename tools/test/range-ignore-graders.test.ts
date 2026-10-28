import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { describe, test } from 'node:test';
import { gradeTask } from '../src/grade/run.ts';

const ROOT = resolve(import.meta.dirname, '../..');

const answer = (summary: string): string =>
  [
    '```json',
    JSON.stringify({
      findings: [{ rule_id: null, severity: 'minor', file: 'src/x', line: 1, summary, fix: 'Plan the migration.' }],
    }),
    '```',
  ].join('\n');

// With api-facts, the model reports the 6.7 deprecation as a minor note. That
// is true for a ~6.6.0 plugin, so the ignore tasks accept it; a claim that the
// API is gone stays a false positive.
const CASES = [
  {
    task: 'review-js-plugin-range-ignore',
    note: 'The new override targets FlyoutMenu, which api-facts reports as @deprecated for removal in v6.7.0 across 6.6.4.0 to 6.6.10.29, so the override must be reworked when the extension moves to 6.7.',
    gone: 'Core removed the FlyoutMenu plugin in 6.7.0.0, so the import fails.',
  },
  {
    task: 'review-admin-block-range-ignore',
    note: 'The override hooks sw_customer_base_metadata_default_payment, which api-facts shows as deprecated for removal in 6.7; on 6.7 the row would silently disappear.',
    gone: 'The block sw_customer_base_metadata_default_payment is missing in 6.7, so the row never renders.',
  },
  {
    task: 'review-storefront-template-range-ignore',
    note: 'The override targets layout_navigation_flyout_bar_category, which core marks @deprecated v6.7.0 in 6.6.4.0+, so the teaser silently disappears once the extension supports 6.7.',
    gone: 'Core removed layout/navigation/flyout.html.twig in 6.7.0.0, so this override never renders.',
  },
];

describe('range ignore graders', () => {
  for (const c of CASES) {
    test(`${c.task} accepts a deprecation note`, async () => {
      assert.equal((await gradeTask(ROOT, c.task, { workdir: ROOT, transcript: answer(c.note) })).pass, true);
    });
    test(`${c.task} rejects a removal claim`, async () => {
      assert.equal((await gradeTask(ROOT, c.task, { workdir: ROOT, transcript: answer(c.gone) })).pass, false);
    });
  }
});
