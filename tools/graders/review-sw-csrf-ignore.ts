// Grader: review-sw-csrf-ignore (sw-storefront, SF-009)
// The change adds the same redeem form without any CSRF call, which is
// correct on 6.5+: storefront forms need no token. A minor+ finding that
// names SF-009 or mentions CSRF at all (the form "lacks CSRF protection") is
// a false positive.
import { reviewIgnore } from '../src/grade/review.ts';

export const grade = reviewIgnore({
  rule: 'SF-009',
  summary: /csrf|unknown .{0,10}function|removed in 6\.5|\b6\.5\b/iu,
});
