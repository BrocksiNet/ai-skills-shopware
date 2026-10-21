// Grader: review-migration-customized-data-catch (shopware-plugin-development, PLG-028)
// The migration rewrites the gift card mail template text for every shop,
// including templates the merchant edited. Needs a major+ finding in
// src/Migration/ that names PLG-028 or describes overwriting merchant edits.
import { reviewCatch } from '../src/grade/review.ts';

export const grade = reviewCatch({
  rule: 'PLG-028',
  file: 'src/Migration/**',
  minSeverity: 'major',
  summary:
    /customi[sz]|merchant|shop owner|edited|modified by|updated_at|overwrit|clobber|user.?made|own (template|text|changes)/iu,
});
