// Grader: review-admin-core-block-range-near-miss (decoy ADM-039)
// SwagCustomerInsights supports shopware/core ~6.6.0 || ~6.7.0 and overrides
// core block sw_customer_base_metadata_default_payment of sw-customer-base-info.
// Core removed that block in 6.7.0.0, as api-facts.txt shows. The plugin did
// not break its own shipped component API, so ADM-039 does not cover it;
// PLG-001 (supported Shopware range) does. Needs a major+ finding in
// src/Resources/app/administration/ about the missing 6.7 block under PLG-001
// or no ID; citing ADM-039 fails.
import { reviewNearMiss } from '../src/grade/review.ts';

export const grade = reviewNearMiss({
  rule: 'ADM-039',
  accept: ['PLG-001'],
  file: 'src/Resources/app/administration/**',
  minSeverity: 'major',
  summary:
    /(remov|no longer (exist|ship|render|load|regist)|(does not|doesn't|did not) exist|missing|gone|dropped)(?:[^.]|\.\S){0,80}6\.7|6\.7(?:[^.]|\.\S){0,80}(remov|no longer|(does not|doesn't) exist|missing|gone|drop|silently)/iu,
});
