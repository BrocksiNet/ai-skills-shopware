// Grader: review-test-changed-expectation-catch (sw-testing, TEST-036)
// The PR switches LoyaltyCalculator from floor() to round() and edits the
// existing data-provider case from 1 to 2 points to match. Nothing in the
// diff announces the new rounding. Needs a major+ finding in tests/ that
// names TEST-036 or describes the expectation changed with the code.
import { reviewCatch } from '../src/grade/review.ts';

export const grade = reviewCatch({
  rule: 'TEST-036',
  file: 'tests/**',
  minSeverity: 'major',
  summary:
    /expectation|expected (value|points|result)|(changed|edited|rewrote|rewritten|updated|adjusted|flipped|relaxed|loosened).{0,40}(test|case|assertion|data.provider)|(test|case|assertion).{0,40}(changed|edited|rewritten|updated|adjusted|flipped).{0,30}(match|fit|follow|agree)|not announced|unannounced|without (a |any )?(changelog|announcement)/iu,
});
