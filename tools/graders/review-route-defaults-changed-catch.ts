// Grader: review-route-defaults-changed-catch (sw-security, SEC-007)
// The released /store-api/swag-loyalty/rewards route switches from a public,
// HTTP-cached route to `_loginRequired` and drops `_httpCache`. Guest clients
// get 403 and every call misses the cache. Needs a major+ finding in src/
// that names SEC-007 or describes the changed route defaults.
import { reviewCatch } from '../src/grade/review.ts';

export const grade = reviewCatch({
  rule: 'SEC-007',
  file: 'src/**',
  minSeverity: 'major',
  summary:
    /_loginRequired|_httpCache|login.?required|requires? (a )?login|logged.?in|anonymous|guests?\b|401|403|no longer (cached|public)|cach|route (scope|defaults)|breaking|backward.?compat|\bBC\b|existing (clients|callers)/iu,
});
