// Grader: review-private-cleanup-deprecation-ignore (sw-core-development, CORE-023)
// The same private cleanup, marked the compliant way: an inline
// `// @deprecated tag:` comment at the branch in round(), no docblock on the
// private helper. A minor+ finding that names CORE-023 or calls the inline
// marker a docblock/annotation problem is a false positive.
import { reviewIgnore } from '../src/grade/review.ts';

export const grade = reviewIgnore({
  rule: 'CORE-023',
  summary:
    /@deprecated[^.]{0,80}(docblock|annotation|method-level)|(docblock|annotation|method-level)[^.]{0,80}@deprecated|inline (comment|tag)/iu,
});
