// Grader: review-admin-mixin-ignore (sw-admin-js, ADM-007)
// The change adds the same loyalty-points state and loader as a composable
// (useLoyaltyPoints) called from setup(), which the rule asks for. A minor+
// finding that names ADM-007 (or ADM-017) or calls the composable a mixin is
// a false positive.
import { reviewIgnore } from '../src/grade/review.ts';

export const grade = reviewIgnore({
  rule: 'ADM-007',
  also: ['ADM-017'],
  summary: /\bmixins?\b/iu,
});
