// Grader: review-sync-erp-call-near-miss (decoy REV-033)
// The order-placed subscriber posts to the ERP in the checkout request with
// a 30 s timeout and throws on any error response. Nothing is queued, so
// REV-033 (an inline fallback for queued work) does not cover it, and no
// other rule does. Needs a major+ finding in src/ about the blocking call,
// under no catalog ID; citing REV-033 for it fails.
import { reviewNearMiss } from '../src/grade/review.ts';

export const grade = reviewNearMiss({
  rule: 'REV-033',
  accept: [],
  file: 'src/**',
  minSeverity: 'major',
  summary:
    /synchron|inline|block|time ?out|in the (checkout|order|request)|during (the )?(checkout|order|request)|(erp|http|request|call)[^.]{0,80}(fails?|throws?|down|unavailable|slow)|queue|message (bus|handler)|async/iu,
});
