// Grader: review-pr-size-ignore (sw-review-learnings, REV-005)
// The change is one feature slice of about 220 changed lines, under the
// size guide. A minor+ finding that names REV-005 or the size of the change
// is a false positive.
import { reviewIgnore } from '../src/grade/review.ts';

export const grade = reviewIgnore({
  rule: 'REV-005',
  summary: /(changed lines|lines changed|line count|PR size|too (large|big)|\b400\b)/iu,
});
