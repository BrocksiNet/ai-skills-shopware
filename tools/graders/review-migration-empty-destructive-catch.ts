// Grader: review-migration-empty-destructive-catch (sw-core-development, CORE-040)
// The new migration's updateDestructive() is empty, and its test only runs it
// and expects no error, so the test covers no behaviour. Needs a minor+
// finding in src/Core/Migration/ that names CORE-040 or describes the test of
// a no-op method.
import { reviewCatch } from '../src/grade/review.ts';

export const grade = reviewCatch({
  rule: 'CORE-040',
  file: 'src/Core/Migration/**',
  minSeverity: 'minor',
  summary: /\b(empty|no-op|noop|does nothing|trivial|tautolog|meaningless)\b/iu,
});
