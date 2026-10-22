// Grader: review-cache-disabled-for-logged-in-catch (sw-storefront, SF-013)
// A new response subscriber marks every page private and no-store for
// logged-in customers so the points badge is right. It bypasses the cache
// policies and makes every page of every logged-in customer uncached. Needs
// a major+ finding in src/ that names SF-013 or describes switching caching
// off for logged-in customers.
import { reviewCatch } from '../src/grade/review.ts';

export const grade = reviewCatch({
  rule: 'SF-013',
  file: 'src/**',
  minSeverity: 'major',
  summary:
    /no-store|cache-control|private|disabl\w* (the )?(http |page )?cach|cach\w* (is )?(disabled|switched off|turned off|bypassed)|bypass\w* (the )?(http |page )?cach|uncached|cache polic|logged.in[^.]{0,80}cach|cach\w*[^.]{0,80}logged.in/iu,
});
