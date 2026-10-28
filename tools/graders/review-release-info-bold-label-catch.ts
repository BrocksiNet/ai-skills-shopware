// Grader: review-release-info-bold-label-catch (sw-core-development, CORE-049)
// The RELEASE_INFO entry opens with a bold label. Needs a minor+ finding in
// RELEASE_INFO-*.md that names CORE-049 or describes the bold label.
import { reviewCatch } from '../src/grade/review.ts';

export const grade = reviewCatch({
  rule: 'CORE-049',
  file: 'RELEASE_INFO-*.md',
  minSeverity: 'minor',
  summary: /bold|\*\*/iu,
});
