// Grader: review-js-plugin-option-renamed-ignore (sw-storefront, SF-011)
// The plugin adds an animate option with a default and keeps every existing
// option and event. A minor+ finding that names SF-011 or calls it a
// breaking change for themes is a false positive.
import { reviewIgnore } from '../src/grade/review.ts';

export const grade = reviewIgnore({
  rule: 'SF-011',
  summary:
    /renam|remov|no longer (read|emit|publish|support)|deprecat|breaks? (themes?|overrides?|extensions?|listeners?|subscribers?)|themes?\b[^.]{0,80}(break|overrid|options?|attribute)|backward.?compat|\bBC\b|breaking|old (option|event|name)/iu,
});
