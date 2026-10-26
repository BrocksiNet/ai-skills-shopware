// Grader: review-assert-same-scalar-ignore (sw-testing, TEST-018)
// The scalar is pinned with assertSame; the entries list is an array, which the
// rule does not cover, so assertEquals there is correct. A minor+ finding that
// names TEST-018 or calls the array assertion loose is a false positive.
import { reviewIgnore } from '../src/grade/review.ts';

export const grade = reviewIgnore({
  rule: 'TEST-018',
  summary: /assertEquals|loose|scalar/iu,
});
