// Grader: review-route-input-ignore (sw-security, SEC-005)
// The same leaderboard route, but `limit` is clamped to 1..50 and `offset` to
// 0 or more before they reach the DAL. A minor+ finding that names SEC-005 or
// calls the input unbounded or unconstrained is a false positive.
import { reviewIgnore } from '../src/grade/review.ts';

export const grade = reviewIgnore({
  rule: 'SEC-005',
  summary:
    /unbound|no (upper |max(imum)? )?(bound|limit|cap)|unconstrained|not (constrained|capped|bounded|limited)|without (a )?(max|upper|cap)|whole table|dump/iu,
});
