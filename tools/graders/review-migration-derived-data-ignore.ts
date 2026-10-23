// Grader: review-migration-derived-data-ignore (sw-plugin-development, PLG-020)
// The same batched backfill shape, but it copies product_number, a plain
// column, into the listing table and computes nothing. A minor+ finding that
// names PLG-020 or asks for an indexer is a false positive.
import { reviewIgnore } from '../src/grade/review.ts';

export const grade = reviewIgnore({
  rule: 'PLG-020',
  summary: /indexer|registerIndexer|PostUpdateIndexer|derived (data|values?)|recomput/iu,
});
