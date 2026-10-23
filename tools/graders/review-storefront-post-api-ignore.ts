// Grader: review-storefront-post-api-ignore (sw-review-learnings, REV-018)
// The add has a Store-API POST next to the storefront one, so the action has
// an API equivalent. A minor+ finding that names REV-018 or claims the add has
// no Store-API equivalent is a false positive.
import { reviewIgnore } from '../src/grade/review.ts';

export const grade = reviewIgnore({
  rule: 'REV-018',
  summary: /(no store-?api|missing store-?api|storefront[- ]only|post[- ]only|headless|non-twig)/iu,
});
