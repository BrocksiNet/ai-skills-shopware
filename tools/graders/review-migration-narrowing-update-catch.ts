// Grader: review-migration-narrowing-update-catch (shopware-plugin-development, PLG-030)
// update() shrinks external_ref from VARCHAR(255) NULL to VARCHAR(64) NOT
// NULL without a default: existing rows fail or get cut. Needs a major+
// finding in src/Migration/ that names PLG-030 or describes the narrowing.
import { reviewCatch } from '../src/grade/review.ts';

export const grade = reviewCatch({
  rule: 'PLG-030',
  file: 'src/Migration/**',
  minSeverity: 'major',
  summary:
    /narrow|shrink|shorten|truncat|NOT NULL|without (a )?default|no default|updateDestructive|destructive|data loss|lose data|existing (rows|values|data)|longer than 64/iu,
});
