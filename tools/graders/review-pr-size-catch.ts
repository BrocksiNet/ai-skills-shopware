// Grader: review-pr-size-catch (sw-review-learnings, REV-005)
// The diff is one PR of about 550 changed lines that mixes a command, a CSV
// export, an event with its subscriber and a plugin refactor, without a split.
// A minor+ finding that names REV-005 or the size of the change passes.
import { reviewCatch } from '../src/grade/review.ts';

export const grade = reviewCatch({
  rule: 'REV-005',
  file: '**',
  minSeverity: 'minor',
  summary: /(changed lines|lines changed|line count|PR size|too (large|big)|\b400\b|\bsplit\b)/iu,
});
