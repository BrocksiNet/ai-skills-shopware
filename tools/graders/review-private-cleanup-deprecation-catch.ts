// Grader: review-private-cleanup-deprecation-catch (sw-core-development, CORE-023)
// RoundingCalculator::roundLegacyHalfUp() is private cleanup, and its removal
// marker is a method-level @deprecated docblock. CORE-023 wants a short inline
// `// @deprecated tag:` comment near the branch in round() instead. Needs a
// minor+ finding in src/Core/ that names CORE-023 or describes the docblock.
import { reviewCatch } from '../src/grade/review.ts';

export const grade = reviewCatch({
  rule: 'CORE-023',
  file: 'src/Core/**',
  minSeverity: 'minor',
  summary:
    /@deprecated[^.]{0,80}(docblock|annotation|method-level)|(docblock|annotation|method-level)[^.]{0,80}@deprecated|inline (comment|tag)/iu,
});
