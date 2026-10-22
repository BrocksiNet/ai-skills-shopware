// Grader: review-cache-tags-event-catch (sw-plugin-development, PLG-007)
// SwagLoyalty requires shopware/core ~6.7.0. The change adds a subscriber
// to ProductDetailRouteCacheTagsEvent that tags the product with its loyalty
// badge, and a writer that invalidates that tag. 6.7 removed Store-API route
// caching: the event still exists but is never dispatched, so the tag never
// reaches the HTTP cache. Needs a major+ finding in the plugin sources that
// names PLG-007 or describes the dead event.
import { reviewCatch } from '../src/grade/review.ts';

export const grade = reviewCatch({
  rule: 'PLG-007',
  file: 'src/**',
  minSeverity: 'major',
  summary:
    /deprecat|no longer (dispatched|fired|used)|never (dispatched|fires|runs|called|triggered)|CacheTagCollector|AddCacheTagEvent|route cach(e|ing) (was )?removed|\b6\.7\b/iu,
});
