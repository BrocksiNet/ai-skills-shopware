// Grader: review-change-scope-ignore (sw-review-learnings, REV-032)
// The fix adds the same null check and a regression test for it, nothing
// outside the resolver's path. A minor+ finding that names REV-032 or calls
// the change a boyscout is a false positive.
import { reviewIgnore } from '../src/grade/review.ts';

export const grade = reviewIgnore({
  rule: 'REV-032',
  summary: /\b(boy-?scout\w*|drive-by (refactor|cleanup))\b/iu,
});
