// Grader: review-migration-merchant-overwrite-near-miss (decoy PLG-019)
// Migration1730000002UpdateWelcomeMail updates mail_template_translation in
// ordered batches of 500, so PLG-019 (unbatched backfill) is satisfied.
// However, the UPDATE omits `updated_at IS NULL`, overwriting mail templates
// that merchants customized. PLG-028 covers that; citing PLG-019 fails.
import { reviewNearMiss } from '../src/grade/review.ts';

export const grade = reviewNearMiss({
  rule: 'PLG-019',
  accept: ['PLG-028'],
  file: 'src/Migration/**',
  minSeverity: 'major',
  summary:
    /customi[sz]|merchant|shop owner|edited|modified by|updated_at|overwrit|clobber|user.?made|own (template|text|changes)/iu,
});
