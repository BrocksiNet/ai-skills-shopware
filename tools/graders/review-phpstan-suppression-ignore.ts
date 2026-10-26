// Grader: review-phpstan-suppression-ignore (sw-core-development, CORE-062)
// The same method, with the Context passed in and no suppression. A minor+
// finding that names CORE-062 or the phpstan-shopware rule is a false positive.
import { reviewIgnore } from '../src/grade/review.ts';

export const grade = reviewIgnore({
  rule: 'CORE-062',
  summary: /phpstan-shopware|shopwarelabs|suppress|silenc|phpstan-ignore/iu,
});
