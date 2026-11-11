// Grader: review-migration-destructive-backfill-ignore (sw-plugin-development, PLG-018)
// The same tier move, but the tier_id backfill is batched in update() and
// updateDestructive() only deletes one config key and drops the column. A
// minor+ finding that names PLG-018 or calls the destructive step heavy is a
// false positive.
import { reviewIgnore } from '../src/grade/review.ts';

export const grade = reviewIgnore({
  rule: 'PLG-018',
  summary:
    /updateDestructive[^.]*(heavy|\blong|slow|time ?out|backfill|whole table|entire table|every row|all (rows|accounts)|stay small)|(heavy|long-running|backfill|time ?out)[^.]*updateDestructive/iu,
});
