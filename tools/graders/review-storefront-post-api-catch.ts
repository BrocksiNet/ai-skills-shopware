// Grader: review-storefront-post-api-catch (sw-review-learnings, REV-018)
// The gift-wrap add is a storefront POST; the Store-API route next to it only
// lists the options, so headless clients cannot add. Needs a major+ finding in
// the storefront controller that names REV-018 or says the add has no Store-API
// equivalent.
import { reviewCatch } from '../src/grade/review.ts';

export const grade = reviewCatch({
  rule: 'REV-018',
  file: 'src/Storefront/**',
  minSeverity: 'major',
  summary: /(no store-?api|missing store-?api|storefront[- ]only|post[- ]only|headless|non-twig)/iu,
});
