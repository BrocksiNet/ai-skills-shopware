// The changed expectation must be explained, even when the review cites TEST-036.
// A reviewer may anchor the finding on the changed code or on its test.
import { reviewCatch } from '../src/grade/review.ts';
import type { Grader } from '../src/grade/kit.ts';

const expectation = {
  rule: 'TEST-036',
  file: 'tests/**',
  minSeverity: 'major' as const,
  summary:
    /existing (case|expectation).{0,100}(changed|rewritten|updated)|expectation|expected (value|points|result)|(changed|edited|rewrote|rewritten|updated|adjusted|flipped|relaxed|loosened).{0,40}(test|case|assertion|data.provider)|(test|case|assertion).{0,40}(changed|edited|rewritten|updated|adjusted|flipped).{0,30}(match|fit|follow|agree)|not announced|unannounced|without (a |any )?(changelog|announcement)/iu,
};

const inTests = reviewCatch(expectation);
const citedAnywhere = reviewCatch({ ...expectation, file: '**', requireCitation: true });
export const grade: Grader = (input) => {
  const cited = citedAnywhere(input);
  return cited.pass ? cited : inTests(input);
};
