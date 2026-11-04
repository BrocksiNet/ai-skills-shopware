// Grader: review-assert-same-scalar-catch (sw-testing, TEST-018)
// The new test pins forCustomer() with assertEquals(120, ...), which still
// passes once the method returns the ledger's string '120'. Needs a minor+
// finding in tests/ explaining how loose equality hides the scalar type change.
import { reviewCatch } from '../src/grade/review.ts';

export const grade = reviewCatch({
  rule: 'TEST-018',
  file: 'tests/**',
  minSeverity: 'minor',
  summary: /assertEquals|loose|strict|assertSame|type change|type[^.]{0,60}(unnoticed|miss|check)/iu,
  allowed: [
    {
      rule: 'PLG-027',
      file: 'src/**',
      minSeverity: 'minor',
      summary: /forCustomer|ledger|cast|Store API[^.]{0,60}string/iu,
    },
  ],
});
