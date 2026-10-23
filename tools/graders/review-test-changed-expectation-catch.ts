// Grader: review-test-changed-expectation-catch (sw-testing, TEST-036)
// The PR switches LoyaltyCalculator from floor() to round() and edits the
// existing data-provider case from 1 to 2 points to match. Nothing in the
// diff announces the new rounding. Needs a major+ finding that cites
// TEST-036 on any changed file (a reviewer may anchor it on the changed code
// line rather than the edited case), or a finding without an ID in tests/
// that describes the expectation changed with the code.
import { reviewCatch } from '../src/grade/review.ts';
import type { Grader } from '../src/grade/kit.ts';

const inTests = reviewCatch({
  rule: 'TEST-036',
  file: 'tests/**',
  minSeverity: 'major',
  summary:
    /expectation|expected (value|points|result)|(changed|edited|rewrote|rewritten|updated|adjusted|flipped|relaxed|loosened).{0,40}(test|case|assertion|data.provider)|(test|case|assertion).{0,40}(changed|edited|rewritten|updated|adjusted|flipped).{0,30}(match|fit|follow|agree)|not announced|unannounced|without (a |any )?(changelog|announcement)/iu,
});

// Only an explicit TEST-036 citation counts here: the summary never matches.
const citedAnywhere = reviewCatch({ rule: 'TEST-036', file: '**', minSeverity: 'major', summary: /(?!)/u });

export const grade: Grader = (input) => {
  const cited = citedAnywhere(input);
  return cited.pass ? cited : inTests(input);
};
