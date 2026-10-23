// Grader: review-test-changed-expectation-ignore (sw-testing, TEST-036)
// The same rounding change and test edit, but CHANGELOG_en-GB.md announces
// that 19.99 now earns 2 points. A minor+ finding that names TEST-036 or
// objects to the changed expectation is a false positive.
import { reviewIgnore } from '../src/grade/review.ts';

export const grade = reviewIgnore({
  rule: 'TEST-036',
  summary:
    /expectation|expected (value|points|result)|(changed|edited|rewrote|rewritten|updated|adjusted|flipped|relaxed|loosened).{0,40}(test|case|assertion|data.provider)|(test|case|assertion).{0,40}(changed|edited|rewritten|updated|adjusted|flipped).{0,30}(match|fit|follow|agree)|not announced|unannounced|without (a |any )?(changelog|announcement)/iu,
});
