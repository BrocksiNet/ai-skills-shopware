// Grader: review-store-api-stricter-request-ignore (sw-plugin-development, PLG-031)
// The change adds an optional `note` parameter and keeps the existing
// validation. A minor+ finding that names PLG-031 or calls the route
// stricter or breaking is a false positive.
import { reviewIgnore } from '../src/grade/review.ts';

export const grade = reviewIgnore({
  rule: 'PLG-031',
  summary:
    /required|stricter|reject|no longer accept|now fails?|400|validation|breaking|backward.?compat|\bBC\b|existing (clients|callers|integrations|requests)/iu,
});
