// Grader: review-deprecation-trigger-ignore (sw-core-development, CORE-022)
// The same deprecation, with its runtime trigger in place and silentUntil set
// to the version that re-enables the notice. A minor+ finding that names
// CORE-022 or calls the trigger or silentUntil marker missing is a false
// positive.
import { reviewIgnore } from '../src/grade/review.ts';

export const grade = reviewIgnore({
  rule: 'CORE-022',
  summary: /trigger|silent/iu,
});
