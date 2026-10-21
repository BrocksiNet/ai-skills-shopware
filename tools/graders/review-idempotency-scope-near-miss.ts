// Grader: review-idempotency-scope-near-miss (decoy SEC-005)
// The redeem route replays a stored response for any request with the same
// Idempotency-Key, whoever sends it, so a reused or guessed key hands out
// another customer's voucher code. The input is validated and typed, so
// SEC-005 does not cover it, and no other rule does. Needs a major+ finding
// in src/ about the unscoped key, under no catalog ID; citing SEC-005 for
// it fails.
import { reviewNearMiss } from '../src/grade/review.ts';

export const grade = reviewNearMiss({
  rule: 'SEC-005',
  accept: [],
  file: 'src/**',
  minSeverity: 'major',
  summary:
    /scop|global|another (customer|caller|user|client)|other (customers?|callers?|users?|clients?)|any (customer|caller|user|client)|leak|cross.(customer|user|tenant)|not (bound|tied) to|regardless of (the )?(customer|caller|user)|guess/iu,
});
