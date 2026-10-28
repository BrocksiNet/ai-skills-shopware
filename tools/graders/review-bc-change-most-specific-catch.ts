// Grader: review-bc-change-most-specific-catch (sw-core-development, CORE-014)
// The class becomes final, an extender break that BecomesFinal names exactly.
// ClassHierarchyChange is the broader attribute. A minor+ finding in src/Core/
// that names CORE-014 or calls the attribute too general or the wrong one passes.
import { reviewCatch } from '../src/grade/review.ts';

export const grade = reviewCatch({
  rule: 'CORE-014',
  file: 'src/Core/**',
  minSeverity: 'minor',
  summary: /ClassHierarchyChange|BecomesFinal|most specific|specific attribute|more specific|too general/iu,
});
