// Grader: review-assert-same-scalar-catch (sw-testing, TEST-018)
// The new test pins forCustomer() with assertEquals(120, ...), which still
// passes once the method returns the ledger's string '120'. Needs a minor+
// finding in tests/ that cites TEST-018 by ID. The summary never matches, so a
// reviewer who describes the loose comparison without the ID does not count:
// this task measures whether the rule itself is read.
import { reviewCatch } from '../src/grade/review.ts';

export const grade = reviewCatch({
  rule: 'TEST-018',
  file: 'tests/**',
  minSeverity: 'minor',
  summary: /(?!)/u,
});
