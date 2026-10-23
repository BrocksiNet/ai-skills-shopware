// Grader: review-store-api-stricter-request-catch (sw-plugin-development, PLG-031)
// The released /store-api/swag-wishlist/add route now requires `list` and a
// new `note` parameter and no longer accepts `later`. Clients that worked
// before get 400 errors. Needs a major+ finding in src/ that names PLG-031
// or describes the new required input or stricter validation.
import { reviewCatch } from '../src/grade/review.ts';

export const grade = reviewCatch({
  rule: 'PLG-031',
  file: 'src/**',
  minSeverity: 'major',
  summary:
    /required|stricter|reject|no longer accept|now fails?|400|validation|breaking|backward.?compat|\bBC\b|existing (clients|callers|integrations|requests)/iu,
});
