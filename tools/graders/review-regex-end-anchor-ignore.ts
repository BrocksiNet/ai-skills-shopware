// Grader: review-regex-end-anchor-ignore (sw-security, SEC-009)
// The same export file name check, but the pattern ends in `\z`, which
// matches only at the very end of the string. Any finding above nit is a
// false positive, most of all one that asks for the `D` modifier on top.
import { reviewIgnore } from '../src/grade/review.ts';

export const grade = reviewIgnore({
  rule: 'SEC-009',
  summary:
    /newline|line break|\\n|\\z|\bD\b.{0,20}(modifier|flag)|(modifier|flag).{0,20}\bD\b|end anchor|end-of-string|\$ (also )?match/iu,
});
