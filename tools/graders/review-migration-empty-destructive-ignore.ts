// Grader: review-migration-empty-destructive-ignore (sw-core-development, CORE-040)
// A destructive step that drops a column, with a test that checks the column
// is gone. It looks like the catch case but is not a no-op: a minor+ finding
// that names CORE-040 or calls the test empty is a false positive.
import { reviewIgnore } from '../src/grade/review.ts';

export const grade = reviewIgnore({
  rule: 'CORE-040',
  summary: /\b(empty|no-op|noop|does nothing|trivial|tautolog|meaningless)\b/iu,
});
