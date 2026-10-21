// Grader: review-route-defaults-changed-ignore (shopware-security, SEC-007)
// The change adds a new login-only route and leaves the existing public
// route as it was. A minor+ finding that names SEC-007 or calls the login
// requirement or caching a breaking route change is a false positive.
import { reviewIgnore } from '../src/grade/review.ts';

export const grade = reviewIgnore({
  rule: 'SEC-007',
  summary:
    /_loginRequired|_httpCache|login.?required|requires? (a )?login|logged.?in|anonymous|guests?\b|401|403|no longer (cached|public)|cach|route (scope|defaults)|breaking|backward.?compat|\bBC\b|existing (clients|callers)/iu,
});
