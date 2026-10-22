// Grader: review-admin-prop-removed-catch (sw-admin-js, ADM-039)
// The released swag-loyalty-card component renames its customerId prop to
// customer, adds a required salesChannelId prop and renames the
// swag_loyalty_card_points block. Plugins that pass customerId or override
// the block break. Needs a major+ finding in the Administration sources that
// names ADM-039 or describes the breaking prop or block change.
import { reviewCatch } from '../src/grade/review.ts';

export const grade = reviewCatch({
  rule: 'ADM-039',
  file: 'src/Resources/app/administration/**',
  minSeverity: 'major',
  summary:
    /renam|remov|no longer (exist|accept|render)|deprecat|breaks? (plugins?|overrides?|extensions?|callers?|existing)|(plugins?|overrides?|extensions?|existing (usages?|callers?))\b[^.]{0,80}(break|fail|stop|lose|miss)|required prop|now required|backward.?compat|\bBC\b|breaking/iu,
});
