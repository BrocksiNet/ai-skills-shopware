// Grader: review-cache-tags-event-ignore (shopware-plugin-development, PLG-007)
// The same badge feature on ~6.7.0, but the product page subscriber
// dispatches AddCacheTagEvent, which reaches the HTTP cache from 6.6 on, and
// the writer invalidates the same tag. A minor+ finding that names PLG-007
// or calls the tagging dead is a false positive.
import { reviewIgnore } from '../src/grade/review.ts';

export const grade = reviewIgnore({
  rule: 'PLG-007',
  summary:
    /deprecat|no longer (dispatched|fired|used)|never (dispatched|fires|runs|called|triggered)|CacheTagCollector|AddCacheTagEvent|route cach(e|ing) (was )?removed|\b6\.7\b/iu,
});
