// Grader: review-admin-template-logic-ignore (sw-admin-js, ADM-017)
// The change adds the same note field, with the hint built by one named
// method called with the count and the maximum, and a setter for the touched
// flag. A minor+ finding that names ADM-017 or calls this inline logic is a
// false positive.
import { reviewIgnore } from '../src/grade/review.ts';

export const grade = reviewIgnore({
  rule: 'ADM-017',
  summary: /template|inline|hint|length|computed|method|subclass|extend|override|setter|bare data/iu,
});
