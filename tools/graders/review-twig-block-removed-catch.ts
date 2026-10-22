// Grader: review-twig-block-removed-catch (sw-storefront, SF-001)
// The plugin template renames block swag_loyalty_badge_label to
// swag_loyalty_badge_text and drops the old name, so theme overrides of the
// old block silently stop rendering. Needs a major+ finding in the views
// that names SF-001 or describes the rename without deprecation.
import { reviewCatch } from '../src/grade/review.ts';

export const grade = reviewCatch({
  rule: 'SF-001',
  file: 'src/Resources/views/**',
  minSeverity: 'major',
  summary:
    /renam|remov|no longer exist|deprecat|breaks? (themes?|overrides?|extensions?)|themes?\b[^.]{0,60}(break|overrid|extend)|backward.?compat|\bBC\b|breaking/iu,
});
