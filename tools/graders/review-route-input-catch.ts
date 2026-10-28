// Grader: review-route-input-catch (sw-security, SEC-005)
// A new public Store-API route passes `limit` and `offset` from the query to
// the DAL. `getInt` types them but sets no bound, so any anonymous caller can
// ask for the whole ranking in one request. Needs a major+ finding in src/
// that names SEC-005 or describes the missing upper bound.
import { reviewCatch } from '../src/grade/review.ts';

export const grade = reviewCatch({
  rule: 'SEC-005',
  file: 'src/**',
  minSeverity: 'major',
  summary:
    /unbound|no (upper |max(imum)? )?(bound|limit|cap)|unconstrained|not (constrained|capped|bounded|limited)|without (a )?(max|upper|cap)|whole table|dump/iu,
});
