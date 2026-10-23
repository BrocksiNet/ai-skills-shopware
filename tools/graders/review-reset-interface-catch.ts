// Grader: review-reset-interface-catch (sw-architecture, ARCH-001)
// LoyaltyConfigReader memoizes per-sales-channel config in properties and
// never clears them. Workers and other long-running processes keep the old
// rates after the merchant changes the config. Needs a major+ finding in
// src/ that names ARCH-001 or describes the missing reset.
import { reviewCatch } from '../src/grade/review.ts';

export const grade = reviewCatch({
  rule: 'ARCH-001',
  file: 'src/**',
  minSeverity: 'major',
  summary:
    /ResetInterface|kernel\.reset|reset\(\)|never (cleared|reset)|stale|long.running|workers?\b|across requests|between requests/iu,
});
