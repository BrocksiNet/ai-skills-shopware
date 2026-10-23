// Grader: review-change-scope-catch (sw-review-learnings, REV-032)
// The focused fix is the null check in ShippingCostResolver. The rest of the
// diff sweeps money formatting into the export and reporting modules, which
// the bug does not touch. Needs a minor+ finding in src/ that names REV-032 or
// uses the boyscouting vocabulary the rule is written in.
import { reviewCatch } from '../src/grade/review.ts';

export const grade = reviewCatch({
  rule: 'REV-032',
  file: 'src/**',
  minSeverity: 'minor',
  summary: /\b(boy-?scout\w*|drive-by (refactor|cleanup))\b/iu,
});
