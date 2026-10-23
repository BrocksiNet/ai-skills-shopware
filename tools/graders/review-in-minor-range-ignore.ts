// Grader: review-in-minor-range-ignore (sw-plugin-development, PLG-001)
// The same change, but composer.json already requires shopware/core
// >=6.7.1 <6.8, and every allowed release has getPrimaryOrderTransaction().
// A minor+ finding that names PLG-001 or calls the method missing is a false
// positive.
import { reviewIgnore } from '../src/grade/review.ts';

export const grade = reviewIgnore({
  rule: 'PLG-001',
  summary:
    /undefined method|(does not|doesn't|did not) exist|not (available|present) (on|in|before)|missing (on|in|from)|(added|introduced|arrived) (only )?in 6\.7\.1|only (exists )?(from|since|in|on) 6\.7\.1|breaks? .{0,40}6\.7\.0/iu,
});
