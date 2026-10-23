// Grader: review-bc-change-machine-readable-ignore (sw-core-development, CORE-015)
// The same planned narrowing, with the bare parameter name `'size'`. A minor+
// finding that names CORE-015 or calls the attribute's parameter name wrong is
// a false positive.
import { reviewIgnore } from '../src/grade/review.ts';

export const grade = reviewIgnore({
  rule: 'CORE-015',
  summary:
    /\$|dollar|parameterName|machine[- ]readable|no (such )?parameter|not (a )?(valid )?parameter|unknown parameter|(does not|doesn.t) (exist|match)/iu,
});
