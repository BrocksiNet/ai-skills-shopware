// Grader: review-js-plugin-option-renamed-catch (shopware-storefront, SF-011)
// The JS plugin renames its showTooltip option to tooltip and its
// onBadgeRendered event to badgeRendered. Themes that set the option in
// data-swag-loyalty-badge-options and plugins subscribed to the event
// silently lose them. Needs a major+ finding in the storefront JS that names
// SF-011 or describes the rename without deprecation.
import { reviewCatch } from '../src/grade/review.ts';

export const grade = reviewCatch({
  rule: 'SF-011',
  file: 'src/Resources/app/storefront/**',
  minSeverity: 'major',
  summary:
    /renam|remov|no longer (read|emit|publish|support)|deprecat|breaks? (themes?|overrides?|extensions?|listeners?|subscribers?)|themes?\b[^.]{0,80}(break|overrid|options?|attribute)|backward.?compat|\bBC\b|breaking|old (option|event|name)/iu,
});
