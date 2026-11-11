// Grader: supported-range-api-arrival
// The plugin allows shopware/core ~6.6.0 || ~6.7.0 and calls
// LineItem::setShippingCostAware(), which arrived in 6.6.7.0. The fix keeps
// the call and 6.6 support, and either guards the call with method_exists or
// starts the range at 6.6.7. The answer must name that boundary: a model
// cannot know a patch release from memory, `npx shopware-api-index`
// (`facts`) prints "missing in 6.6.0.0 … 6.6.6.1".
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fail, findFile, type Grader, read, stripComments, verdict } from '../src/grade/kit.ts';

/** The shopware/core constraint, or '' when composer.json has none. */
function coreRange(workdir: string): string {
  const path = join(workdir, 'composer.json');
  if (!existsSync(path)) return '';
  const match = /"shopware\/core"\s*:\s*"([^"]*)"/u.exec(read(path));
  return match?.[1] ?? '';
}

export const grade: Grader = ({ workdir, transcript }) => {
  const file = findFile(workdir, 'DigitalLineItemSubscriber');
  if (file === undefined) return fail('DigitalLineItemSubscriber.php not found');
  const code = stripComments(read(file));
  const calls = /->\s*setShippingCostAware\s*\(/u.test(code);
  // method_exists($lineItem, …) or method_exists(LineItem::class, …).
  const guarded =
    /method_exists\s*\(\s*(\$\w+|\\?[\w\\]*LineItem::class)\s*,\s*['"]setShippingCostAware['"]\s*\)/u.test(code);
  const range = coreRange(workdir);
  const keeps66 = /6\.6/u.test(range);
  // The 6.6 branch of the range starts at 6.6.7 or later, and no branch
  // still lets in 6.6.0 … 6.6.6.
  const old = /(~|\^|>=?)\s*6\.6(\.[0-6](\.\d+)?)?(?![\d.])/u.test(range);
  const starts667 = /6\.6\.([7-9]|\d\d)/u.test(range) && !old;
  const boundary = /6\.6\.7\b|6\.6\.6\.1\b/u.test(transcript);
  return verdict(boundary && keeps66 && calls && (guarded || starts667), {
    boundary,
    keeps_6_6: keeps66,
    calls,
    guarded,
    range_from_6_6_7: starts667,
  });
};
