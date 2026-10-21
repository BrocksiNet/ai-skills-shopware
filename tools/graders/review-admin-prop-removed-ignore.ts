// Grader: review-admin-prop-removed-ignore (shopware-admin-js, ADM-039)
// The change adds an optional showTier prop with a default and a new
// swag_loyalty_card_tier block, and keeps every existing prop and block.
// A minor+ finding that names ADM-039 or calls it a breaking change for
// plugins is a false positive.
import { reviewIgnore } from '../src/grade/review.ts';

export const grade = reviewIgnore({
  rule: 'ADM-039',
  summary:
    /renam|remov|no longer (exist|accept|render)|deprecat|breaks? (plugins?|overrides?|extensions?|callers?|existing)|(plugins?|overrides?|extensions?|existing (usages?|callers?))\b[^.]{0,80}(break|fail|stop|lose|miss)|required prop|now required|backward.?compat|\bBC\b|breaking/iu,
});
