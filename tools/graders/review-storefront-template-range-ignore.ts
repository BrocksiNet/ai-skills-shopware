// Grader: review-storefront-template-range-ignore (shopware-plugin-development, PLG-001)
// The same change, but composer.json requires shopware/core ~6.6.0, and
// every 6.6 release ships the template. A minor+ finding that names PLG-001
// or calls the template missing in 6.7 is a false positive.
import { reviewIgnore } from '../src/grade/review.ts';

export const grade = reviewIgnore({
  rule: 'PLG-001',
  summary:
    /(remov|no longer (exist|ship|render|load|regist)|(does not|doesn't|did not) exist|missing|gone|dropped|not registered)(?:[^.]|\.\S){0,80}6\.7|6\.7(?:[^.]|\.\S){0,80}(remov|no longer|(does not|doesn't) exist|missing|gone|drop|not registered|silently)/iu,
});
