// Grader: review-test-unit-placement-catch (sw-testing, TEST-034)
// The PR adds LoyaltyCalculator and a test for it under tests/integration/.
// The test uses plain PHPUnit assertions and never boots the kernel, so it
// belongs in tests/unit/. Needs a minor+ finding that cites TEST-034 on a file
// in tests/. A finding without the ID does not count: the rule is the point.
import { reviewCatch } from '../src/grade/review.ts';

export const grade = reviewCatch({
  rule: 'TEST-034',
  file: 'tests/**',
  minSeverity: 'minor',
  summary: /(?!)/u,
});
