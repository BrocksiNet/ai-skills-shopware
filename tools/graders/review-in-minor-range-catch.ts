// Grader: review-in-minor-range-catch (sw-plugin-development, PLG-001)
// SwagOrderExport 1.3.1 keeps shopware/core ~6.7.0 and reads the payment
// status from OrderEntity::getPrimaryOrderTransaction(), which arrived in
// 6.7.1.0. On 6.7.0.0 and 6.7.0.1 every export fails with an undefined
// method. Needs a major+ finding in the plugin sources that names PLG-001 or
// describes the missing method. No skill names getPrimaryOrderTransaction():
// the release comes from the source or api-facts.
import { reviewCatch } from '../src/grade/review.ts';

export const grade = reviewCatch({
  rule: 'PLG-001',
  file: 'src/**',
  minSeverity: 'major',
  summary:
    /undefined method|(does not|doesn't|did not) exist|not (available|present) (on|in|before)|missing (on|in|from)|(added|introduced|arrived) (only )?in 6\.7\.1|only (exists )?(from|since|in|on) 6\.7\.1|breaks? .{0,40}6\.7\.0/iu,
});
