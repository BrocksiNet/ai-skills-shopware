// Grader: review-admin-mixin-catch (sw-admin-js, ADM-007)
// The change adds shared loyalty-points state and loader as a new mixin
// registered with Mixin.register() and used by a badge component. The rule
// asks for a composable instead. Needs a minor+ finding in the Administration
// sources that names ADM-007 (or ADM-017, which says the same) or calls the
// new shared logic a mixin.
import { reviewCatch } from '../src/grade/review.ts';

export const grade = reviewCatch({
  rule: 'ADM-007',
  also: ['ADM-017'],
  file: 'src/Resources/app/administration/**',
  minSeverity: 'minor',
  summary: /\bmixins?\b/iu,
});
