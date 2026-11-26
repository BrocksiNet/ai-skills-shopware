// Grader: review-migration-narrowing-vs-customized-near-miss (decoy PLG-028)
// Migration1730000001ShrinkExternalCode alters the plugin's own internal
// swag_loyalty_account.external_code column in update() from VARCHAR(255) NULL
// to VARCHAR(32) NOT NULL without a default. It does not overwrite merchant-
// customized templates or content, so PLG-028 does not cover it; PLG-030
// (narrowing a column in update()) does. Needs a major+ finding in
// src/Migration/ about the destructive narrowing under PLG-030 or no ID;
// citing PLG-028 fails.
import { reviewNearMiss } from '../src/grade/review.ts';

export const grade = reviewNearMiss({
  rule: 'PLG-028',
  accept: ['PLG-030'],
  file: 'src/Migration/**',
  minSeverity: 'major',
  summary:
    /narrow|shrink|shorten|truncat|NOT NULL|without (a )?default|no default|updateDestructive|destructive|data loss|existing (rows|values|data)|longer than 32/iu,
});
