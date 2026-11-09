// Grader: review-regex-end-anchor-catch (sw-security, SEC-009)
// An Admin route checks a user-given export file name with
// `/^[a-z0-9][a-z0-9_-]{0,63}$/i` and builds a path from it. `$` also matches
// before a trailing newline, so "points\n" passes. Needs a major+ finding in
// src/ that names SEC-009 or describes the trailing newline or end anchor.
import { reviewCatch } from '../src/grade/review.ts';

export const grade = reviewCatch({
  rule: 'SEC-009',
  file: 'src/**',
  minSeverity: 'major',
  summary:
    /newline|line break|\\n|\\z|\bD\b.{0,20}(modifier|flag)|(modifier|flag).{0,20}\bD\b|end anchor|end-of-string|\$ (also )?match/iu,
});
