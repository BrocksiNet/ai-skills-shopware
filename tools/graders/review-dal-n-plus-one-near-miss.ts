// Grader: review-dal-n-plus-one-near-miss (decoy ARCH-002)
// OrderSummaryExporter loads the 50 newest orders with setLimit(50), sorting
// and the orderCustomer association, then runs a separate customerRepository->search() with
// setLimit(1) inside a foreach loop for every order instead of loading
// orderCustomer.customer upfront. Every query is explicitly bounded, so
// ARCH-002 (unbounded DAL reads) does not cover it; REV-021 (per-row
// association loads / N+1) and PLG-015 (load associations in the Criteria, not
// per row) do. Needs a minor+ finding in src/ describing the N+1 / per-row
// query under REV-021, PLG-015 or no ID; citing ARCH-002 fails. Minor, not
// major: the loop is bounded at 50, which the review severity scale calls
// "correct, but costly".
import { reviewNearMiss } from '../src/grade/review.ts';

export const grade = reviewNearMiss({
  rule: 'ARCH-002',
  accept: ['REV-021', 'PLG-015'],
  file: 'src/**',
  minSeverity: 'minor',
  summary:
    /N\+1|per[- ]row|per[- ]order|inside (a |the )?(foreach|loop)|in (a |the )?(foreach|loop)|addAssociation|each order[^.]{0,60}(query|search|load)|separate (query|search|read) (per|for each)/iu,
});
