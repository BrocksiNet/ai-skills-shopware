// Grader: review-storefront-default-context-catch (shopware-plugin-development, PLG-016)
// The change adds a "recommended for your tier" pagelet on the account page
// that searches product.repository with Context::createDefaultContext(). That
// skips the sales channel availability filter (inactive, not visible) and uses
// the system language, default currency and no rule prices, so there is no
// calculatedPrice. Needs a major+ finding in the plugin sources that names
// PLG-016 or describes the missing sales channel context.
import { reviewCatch } from '../src/grade/review.ts';

export const grade = reviewCatch({
  rule: 'PLG-016',
  file: 'src/**',
  minSeverity: 'major',
  summary:
    /createDefaultContext|default context|sales.channel (context|repositor)|visib|inactive|language|currency|(customer group|rule) prices?|calculatedPrice/iu,
});
