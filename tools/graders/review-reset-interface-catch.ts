// ARCH-001: Services with memoization must reset it via ResetInterface or
// kernel.reset tag (with method attribute if the class has a differently-named
// reset() method).
//
// This grader handles the CATCH case: detecting violations.
//
// Violations include:
// 1. Service with memoization that lacks both ResetInterface and kernel.reset tag
// 2. Service tagged kernel.reset without ResetInterface AND without a differently-named
//    reset() method (should implement ResetInterface instead)
//
// The grader checks that the agent reports ARCH-001 findings for these cases.
import { reviewCatch } from '../src/grade/review.ts';
import type { Grader } from '../src/grade/kit.ts';

const expectation = {
  rule: 'ARCH-001',
  file: 'src/**',
  minSeverity: 'major' as const,
  summary:
    /ResetInterface|kernel\.reset|reset\(\)|never (cleared|reset)|stale|long.running|workers?\b|across requests|between requests/iu,
};

export const grade: Grader = reviewCatch(expectation);
