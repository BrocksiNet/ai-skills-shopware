// Grader: review-deprecation-trigger-ignore (sw-core-development, CORE-022)
// The same deprecation as the catch task, with the runtime trigger added as
// the first statement and naming the replacement. A minor+ finding that names
// CORE-022 or describes a missing trigger is a false positive.
import { reviewIgnore } from '../src/grade/review.ts';

export const grade = reviewIgnore({
  rule: 'CORE-022',
  summary:
    /triggerDeprecationOrThrow|runtime (trigger|warning|notice)|no (runtime )?(trigger|warning)|without (a |the )?(runtime )?(trigger|warning)/iu,
});
