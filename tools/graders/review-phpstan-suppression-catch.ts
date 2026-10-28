// Grader: review-phpstan-suppression-catch (sw-core-development, CORE-062)
// A new method in a core service silences a phpstan-shopware custom rule with
// an inline suppression. The stated reason sounds plausible, so a reviewer
// without the rule accepts it. Needs a minor+ finding in src/Core/ that names
// CORE-062, or, without a catalog ID, names the phpstan-shopware rule it breaks.
// A finding that only calls the suppression out is not enough: that is CORE-060's
// ground, and a reviewer without the rule reports it too.
import { reviewCatch } from '../src/grade/review.ts';

export const grade = reviewCatch({
  rule: 'CORE-062',
  file: 'src/Core/**',
  minSeverity: 'minor',
  summary: /phpstan-shopware|shopwarelabs/iu,
});
