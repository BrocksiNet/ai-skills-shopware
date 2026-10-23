// Grader: review-bc-change-most-specific-ignore (sw-core-development, CORE-014)
// The same planned break, with BecomesFinal, the most specific attribute for a
// class that becomes final. A finding above nit that names CORE-014 or calls
// the attribute wrong is a false positive.
import { reviewIgnore } from '../src/grade/review.ts';

export const grade = reviewIgnore({
  rule: 'CORE-014',
  summary: /ClassHierarchyChange|BecomesFinal|most specific|specific attribute|more specific/iu,
});
