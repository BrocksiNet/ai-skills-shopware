// Grader: review-release-info-bold-label-ignore (sw-core-development, CORE-049)
// The same RELEASE_INFO entry without the bold label. A minor+ finding that
// names CORE-049 or calls the entry bold is a false positive.
import { reviewIgnore } from '../src/grade/review.ts';

export const grade = reviewIgnore({
  rule: 'CORE-049',
  summary: /bold|\*\*/iu,
});
