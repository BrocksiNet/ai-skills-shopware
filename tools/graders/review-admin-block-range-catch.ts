// Grader: review-admin-block-range-catch (shopware-plugin-development, PLG-001)
// SwagCustomerInsights 3.3.0 allows shopware/core ~6.6.0 || ~6.7.0 and
// overrides block sw_customer_base_metadata_default_payment of
// sw-customer-base-info. Core removed the block (with the default payment
// method) in 6.7.0.0, so on 6.7 the last used payment method never shows.
// Needs a major+ finding in the admin sources that names PLG-001 or
// describes the block missing in 6.7. No skill names the block.
import { reviewCatch } from '../src/grade/review.ts';

export const grade = reviewCatch({
  rule: 'PLG-001',
  file: 'src/Resources/app/administration/src/**',
  minSeverity: 'major',
  summary:
    /(remov|no longer (exist|ship|render|load|regist)|(does not|doesn't|did not) exist|missing|gone|dropped|not registered)(?:[^.]|\.\S){0,80}6\.7|6\.7(?:[^.]|\.\S){0,80}(remov|no longer|(does not|doesn't) exist|missing|gone|drop|not registered|silently)/iu,
});
