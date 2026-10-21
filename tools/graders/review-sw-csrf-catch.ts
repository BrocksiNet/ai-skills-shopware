// Grader: review-sw-csrf-catch (shopware-storefront, SF-009)
// SwagLoyalty supports Shopware 6.6 and 6.7. The change adds an account page
// with a redeem form that calls sw_csrf(), a Twig function removed in 6.5.
// The template no longer compiles ("Unknown function"), so every page that
// includes it returns a 500. Needs a major+ finding in the storefront views
// that names SF-009 or describes the removed CSRF function.
import { reviewCatch } from '../src/grade/review.ts';

export const grade = reviewCatch({
  rule: 'SF-009',
  file: 'src/Resources/views/**',
  minSeverity: 'major',
  summary: /csrf|unknown .{0,10}function|removed in 6\.5|\b6\.5\b/iu,
});
