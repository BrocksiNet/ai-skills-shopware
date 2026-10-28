// Grader: review-deprecation-framework-callback-catch (sw-core-development, CORE-011)
// ProductIndexingSubscriber::onProductIndexed is deprecated but still called by
// the dispatcher on every indexing event. triggerDeprecationOrThrow() warns on
// every legitimate call; the framework-callback row needs throwIfActive().
// Needs a major+ finding in src/Core/ that names CORE-011 or describes the
// framework callback that warns on every call.
import { reviewCatch } from '../src/grade/review.ts';

export const grade = reviewCatch({
  rule: 'CORE-011',
  file: 'src/Core/**',
  minSeverity: 'major',
  summary: /throwIfActive|framework|subscriber|listener|every (event|run|call)|on every|silent/iu,
});
