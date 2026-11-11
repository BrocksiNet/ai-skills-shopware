// Grader: review-migration-destructive-backfill-catch (sw-plugin-development, PLG-018)
// updateDestructive() runs one full-table UPDATE join over swag_loyalty_account
// before it drops the legacy column. The backfill is long-running work in the
// destructive step; it belongs in update(), batched, so the destructive step
// stays a drop. Needs a major+ finding in src/Migration/ that names PLG-018 or
// describes the heavy work in updateDestructive().
import { reviewCatch } from '../src/grade/review.ts';

export const grade = reviewCatch({
  rule: 'PLG-018',
  file: 'src/Migration/**',
  minSeverity: 'major',
  summary:
    /updateDestructive[^.]*(heavy|\blong|slow|time ?out|backfill|whole table|entire table|every row|all (rows|accounts)|stay small)|(heavy|long-running|backfill|time ?out)[^.]*updateDestructive/iu,
});
