// Grader: review-deprecation-trigger-catch (sw-core-development, CORE-022)
// ProductCollection::getActiveProducts() gets a @deprecated tag, and its
// replacement filterActive() is public, but the method has no runtime
// Feature::triggerDeprecationOrThrow(). PHPStan skips collection classes, so
// the review has to catch it. Needs a minor+ finding in src/Core/ that names
// CORE-022 or describes the missing runtime trigger.
import { reviewCatch } from '../src/grade/review.ts';

export const grade = reviewCatch({
  rule: 'CORE-022',
  file: 'src/Core/**',
  minSeverity: 'minor',
  summary:
    /triggerDeprecationOrThrow|runtime (trigger|warning|notice)|no (runtime )?(trigger|warning)|without (a |the )?(runtime )?(trigger|warning)/iu,
});
