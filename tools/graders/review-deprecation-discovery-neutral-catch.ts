// Grader: review-deprecation-discovery-neutral-catch (sw-core-development, CORE-012)
// LegacyProductStockSubscriber is deprecated for the next major. Its
// getSubscribedEvents() throws once the removal flag is active, where the
// trunk rule returns a neutral value. PHPStan misses it because the events
// come from a helper method. Needs a major+ finding in src/Core/ that names
// CORE-012 or describes the throw in the discovery method.
import { reviewCatch } from '../src/grade/review.ts';

export const grade = reviewCatch({
  rule: 'CORE-012',
  file: 'src/Core/**',
  minSeverity: 'major',
  summary: /throw|neutral|discovery|getSubscribedEvents|return \[\]|empty array/iu,
});
