// Grader: review-bc-change-machine-readable-catch (sw-core-development, CORE-015)
// ParameterTypeNarrowing names its parameter `'$size'`. The attribute takes the
// bare parameter name, so it does not describe the signature. Needs a major+
// finding in src/Core/ that names CORE-015 or describes the `$` in the name.
import { reviewCatch } from '../src/grade/review.ts';

export const grade = reviewCatch({
  rule: 'CORE-015',
  file: 'src/Core/**',
  minSeverity: 'major',
  summary:
    /\$|dollar|parameterName|machine[- ]readable|no (such )?parameter|not (a )?(valid )?parameter|unknown parameter|(does not|doesn.t) (exist|match)/iu,
});
