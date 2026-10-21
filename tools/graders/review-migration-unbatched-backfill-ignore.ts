// Grader: review-migration-unbatched-backfill-ignore (shopware-plugin-development, PLG-019)
// The same backfill in batches of 1,000 ordered by id with a cursor. A
// minor+ finding that names PLG-019 or asks for batching is a false positive.
import { reviewIgnore } from '../src/grade/review.ts';

export const grade = reviewIgnore({
  rule: 'PLG-019',
  summary:
    /batch|chunk|single (UPDATE|statement|query)|one (UPDATE|statement|query)|whole table|entire table|every row|all rows|large (table|shops?)|big (table|shops?)|\block|time ?out|cursor/iu,
});
