// Grader: review-history-comment-catch (sw-review-learnings, REV-034)
// The new docblock tells the story of the pull request: an earlier revision
// that filtered on `available`, an association removed again in review, an
// issue number. Needs a minor+ finding in src/ that names REV-034 or
// describes the history in the comment.
import { reviewCatch } from '../src/grade/review.ts';

export const grade = reviewCatch({
  rule: 'REV-034',
  file: 'src/**',
  minSeverity: 'minor',
  summary:
    /(histor|earlier (version|revision|approach)|previous (version|revision|approach|code)|removed (code|again)|narrat|story|belongs? in the (PR|pull request|commit)|PR (history|story)|stale)/iu,
});
