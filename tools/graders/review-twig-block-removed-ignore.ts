// Grader: review-twig-block-removed-ignore (sw-storefront, SF-001)
// The change adds an inner block and keeps every existing block name. A
// minor+ finding that names SF-001 or calls it a breaking change for themes
// is a false positive.
import { reviewIgnore } from '../src/grade/review.ts';

export const grade = reviewIgnore({
  rule: 'SF-001',
  summary:
    /renam|remov|no longer exist|deprecat|breaks? (themes?|overrides?|extensions?)|themes?\b[^.]{0,60}(break|overrid|extend)|backward.?compat|\bBC\b|breaking/iu,
});
