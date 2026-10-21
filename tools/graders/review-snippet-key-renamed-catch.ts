// Grader: review-snippet-key-renamed-catch (shopware-storefront, SF-012)
// The plugin renames snippet key swag-loyalty.badge.label to
// swag-loyalty.badge.title. Themes and merchant snippet sets that override
// or use the old key fall back to the raw key. Needs a major+ finding in
// src/Resources/ that names SF-012 or describes the rename without
// deprecation.
import { reviewCatch } from '../src/grade/review.ts';

export const grade = reviewCatch({
  rule: 'SF-012',
  file: 'src/Resources/**',
  minSeverity: 'major',
  summary:
    /renam|remov|no longer exist|deprecat|breaks? (themes?|overrides?|translations?|templates?)|themes?\b[^.]{0,80}(break|overrid|translat)|backward.?compat|\bBC\b|breaking|old (snippet )?key|missing translation|untranslated/iu,
});
