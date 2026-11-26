// Grader: review-cache-key-vs-tags-near-miss (decoy PLG-007)
// RecommendationCacheSubscriber subscribes to ProductPageLoadedEvent on ^6.7.2
// and adds HTTP cache tags properly via CacheTagCollector::addTag() (no
// deprecated *CacheTagsEvent). However, it caches recommendations under a key
// containing only the product ID while the result depends on sales channel,
// language, and currency. PLG-007 does not cover cache-key inputs; IMP-008
// does. Needs a major+ finding in src/ about the incomplete cache key under
// IMP-008 or no ID; citing PLG-007 fails.
import { reviewNearMiss } from '../src/grade/review.ts';

export const grade = reviewNearMiss({
  rule: 'PLG-007',
  accept: ['IMP-008'],
  file: 'src/**',
  minSeverity: 'major',
  summary:
    /cache key|(key|cache)[^.]{0,80}(missing|lacks?|without|ignores?|omits?|only (uses|contains|includes|the product))|(sales.?channel|language|currency|customer group)[^.]{0,60}(key|cache|missing|omitted)|cross.?(sales.?channel|language|currency)|leak/iu,
});
