// ARCH-001 ignore cases: properly reset memoization.
//
// 1. ResetInterface implementation: service implements ResetInterface and
//    clears memoized properties in reset(). Expected: no ARCH-001 finding.
//
// 2. kernel.reset with method attribute: service has a differently-named
//    reset(...) method (from an abstract class, etc.) and tags itself
//    kernel.reset with a method attribute, e.g. ['method' => 'resetAll'].
//    Expected: no ARCH-001 finding.
import { reviewIgnore } from '../src/grade/review.ts';
import type { Grader } from '../src/grade/kit.ts';

export const grade: Grader = reviewIgnore({
  rule: 'ARCH-001',
  summary:
    /ResetInterface|kernel\.reset|reset\(\)|never (cleared|reset)|stale|long.running|workers?\b|across requests|between requests/iu,
});
