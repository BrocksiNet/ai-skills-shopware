// Grader: review-migration-customized-data-ignore (sw-plugin-development, PLG-028)
// The same update guarded with `updated_at IS NULL`. A minor+ finding that
// names PLG-028 or says merchant edits get overwritten is a false positive.
import { reviewIgnore } from '../src/grade/review.ts';

export const grade = reviewIgnore({
  rule: 'PLG-028',
  summary:
    /customi[sz]|merchant|shop owner|edited|modified by|updated_at|overwrit|clobber|user.?made|own (template|text|changes)/iu,
});
