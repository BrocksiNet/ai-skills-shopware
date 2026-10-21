// Grader: review-raw-sql-invalidation-near-miss (decoy IMP-008)
// A bulk update changes tier thresholds with raw SQL. The tier page is HTTP
// cached and tagged per tier, and nothing invalidates those tags, so shops
// show the old thresholds. The cache key is fine, so IMP-008 does not cover
// it; PLG-003, PLG-007 and REV-024 do. Needs a major+ finding in src/ about
// the missing invalidation; citing IMP-008 for it fails.
import { reviewNearMiss } from '../src/grade/review.ts';

export const grade = reviewNearMiss({
  rule: 'IMP-008',
  accept: ['PLG-003', 'PLG-007', 'REV-024'],
  file: 'src/**',
  minSeverity: 'major',
  summary:
    /invalidat|stale|outdated|purge|(old|previous) thresholds?|cach\w*[^.]{0,80}(not|never) (be )?(updated|cleared|refreshed)/iu,
});
