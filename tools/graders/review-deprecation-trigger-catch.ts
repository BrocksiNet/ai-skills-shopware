// Grader: review-deprecation-trigger-catch (sw-core-development, CORE-022)
// MediaPathBuilder::buildPath() gets a @deprecated with an exception reason
// and no runtime trigger, and no silentUntil, so the notice never fires and
// nothing says when it comes back. Needs a major+ finding in src/Core/ that
// names CORE-022 or describes the missing trigger or silentUntil marker.
import { reviewCatch } from '../src/grade/review.ts';

export const grade = reviewCatch({
  rule: 'CORE-022',
  file: 'src/Core/**',
  minSeverity: 'major',
  summary: /trigger|silent/iu,
});
