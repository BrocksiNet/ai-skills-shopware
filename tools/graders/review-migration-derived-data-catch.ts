// Grader: review-migration-derived-data-catch (sw-plugin-development, PLG-020)
// The backfill is batched (PLG-019 is satisfied), but it recomputes a listing
// hash from product fields in SQL. The finding must come from the derived-data
// rule: a major+ finding in src/Migration/ that names PLG-020 or asks for an
// indexer.
import { reviewCatch } from '../src/grade/review.ts';

export const grade = reviewCatch({
  rule: 'PLG-020',
  file: 'src/Migration/**',
  minSeverity: 'major',
  summary: /indexer|registerIndexer|PostUpdateIndexer|derived (data|values?)|recomput/iu,
});
