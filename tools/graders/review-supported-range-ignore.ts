// Grader: review-supported-range-ignore (sw-plugin-development, PLG-001)
// The same switch to paidPartially(), but release 3.0.0 narrows
// shopware/core to ~6.7.0 and says so in the changelog. Every allowed release
// has the method. A minor+ finding that names PLG-001 or calls the method
// missing is a false positive.
import { reviewIgnore } from '../src/grade/review.ts';

export const grade = reviewIgnore({
  rule: 'PLG-001',
  summary:
    /undefined method|(does not|doesn't|did not) exist|not (available|present) (on|in|before)|missing (on|in|from)|(added|introduced|arrived) (only )?in 6\.7|only (exists )?(from|since|in|on) 6\.7|breaks? .{0,40}6\.6/iu,
});
