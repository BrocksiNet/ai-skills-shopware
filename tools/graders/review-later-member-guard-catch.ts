// Grader: review-later-member-guard-catch (shopware-plugin-development, PLG-024)
// SwagCustomerPrices supports ~6.6.0 || ~6.7.0 and registers a subscriber for
// HttpCacheCookieEvent behind class_exists(), which is right: the class
// arrived in 6.6.6.0. The subscriber calls $event->getHash(), which only
// arrived in 6.7.6.0, so 6.6.6.0 to 6.7.5.x pass the guard and fail with an
// undefined method. Needs a major+ finding in the plugin sources that names
// PLG-024 or PLG-001, or describes getHash() missing behind the class guard.
// No skill names these symbols: the releases come from the source or api-facts.
import { reviewCatch } from '../src/grade/review.ts';

export const grade = reviewCatch({
  rule: 'PLG-024',
  also: ['PLG-001'],
  file: 'src/**',
  minSeverity: 'major',
  summary:
    /getHash(\(\))?.{0,160}(missing|undefined|(does not|doesn't|did not) exist|not (available|present)|only (exists )?(from|since|in|on)|(added|introduced|arrived) in|6\.7\.6)|(undefined method|missing|(does not|doesn't) exist).{0,80}getHash/iu,
});
