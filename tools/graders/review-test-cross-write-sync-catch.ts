// Catch grader for TEST-038: cross-write DAL behavior via Sync API
// The test must use Sync API with multiple writes to test the merged state,
// not separate single-write calls.
import { reviewCatch } from '../src/grade/review.ts';
import type { Grader } from '../src/grade/kit.ts';

const expectation = {
  rule: 'TEST-038',
  file: 'tests/**',
  minSeverity: 'major' as const,
  summary:
    /separate (single.?)?writes?|single.?write (call|update|create|api)|independent writes?|sequent[a-z]* (api )?calls?|(multiple )?write (in |of )?(isolation|separate)|(not|never) (via |through )?(sync|api.*sync)|cross.?write|merged state|sync (api|request)/iu,
};

const inTests = reviewCatch(expectation);
const citedAnywhere = reviewCatch({ ...expectation, file: '**', requireCitation: true });
export const grade: Grader = (input) => {
  const cited = citedAnywhere(input);
  return cited.pass ? cited : inTests(input);
};
