// Grader: review-history-comment-ignore (sw-review-learnings, REV-034)
// The docblock states what the method does and why the setting is read per
// sales channel, and points at its test. A minor+ finding that names
// REV-034 or calls the comment history is a false positive.
import { reviewIgnore } from '../src/grade/review.ts';

export const grade = reviewIgnore({
  rule: 'REV-034',
  summary: /(histor|earlier (version|revision|approach)|previous (version|revision|approach|code)|removed (code|again)|narrat|story|belongs? in the (PR|pull request|commit)|PR (history|story)|stale)/iu,
});
