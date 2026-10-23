// Grader: review-admin-template-logic-catch (sw-admin-js, ADM-017)
// The change builds a character hint and a too-long check inline in the
// Twig template, and keeps a bare data field the template writes. A minor+
// finding that names ADM-017 or describes the inline logic passes.
import { reviewCatch } from '../src/grade/review.ts';

export const grade = reviewCatch({
  rule: 'ADM-017',
  file: 'src/Resources/app/administration/**',
  minSeverity: 'minor',
  summary: /template|inline|hint|length|computed|method|subclass|extend|override|setter|bare data/iu,
});
