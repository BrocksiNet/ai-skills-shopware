// Grader: review-deprecation-framework-callback-ignore (sw-core-development, CORE-011)
// The same deprecated subscriber method, with throwIfActive() as the first
// statement and a public replacement shipped in the same change. A minor+
// finding that names CORE-011 or says the tools should be swapped is a false
// positive.
import { reviewIgnore } from '../src/grade/review.ts';

export const grade = reviewIgnore({
  rule: 'CORE-011',
  summary:
    /triggerDeprecationOrThrow[^.]{0,60}(instead|should|must)|should (call|use) triggerDeprecationOrThrow|mix(es|ing|ed)?\b|both (tools|mechanisms)/iu,
});
