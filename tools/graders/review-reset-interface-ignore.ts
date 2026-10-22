// Grader: review-reset-interface-ignore (sw-architecture, ARCH-001)
// The same memoization, but the service implements ResetInterface and
// reset() clears both arrays. A minor+ finding that names ARCH-001 or calls
// the cache stale or unreset is a false positive.
import { reviewIgnore } from '../src/grade/review.ts';

export const grade = reviewIgnore({
  rule: 'ARCH-001',
  summary:
    /ResetInterface|kernel\.reset|reset\(\)|never (cleared|reset)|stale|long.running|workers?\b|across requests|between requests/iu,
});
