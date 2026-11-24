// Grader: review-test-cross-write-sync-ignore (sw-testing, TEST-038)
// The same multi-write test scenario is correctly tested through Sync API
// with both writes in one request, so the validator sees the merged state.
// No finding should be reported.
import { reviewIgnore } from '../src/grade/review.ts';

export const grade = reviewIgnore({
  rule: 'TEST-038',
  summary:
    /separate (single.?)?writes?|single.?write (call|update|create|api)|independent writes?|sequent[a-z]* (api )?calls?|(multiple )?write (in |of )?(isolation|separate)|(not|never) (via |through )?(sync|api.*sync)/iu,
});
