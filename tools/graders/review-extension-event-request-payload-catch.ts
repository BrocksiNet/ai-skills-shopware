// Grader: review-extension-event-request-payload-catch (sw-architecture, ARCH-005)
// LoyaltyPointsCalculateEvent drops its public salesChannelId and
// customerGroupId properties and carries the whole Request instead. Existing
// listeners break, and the event cannot be built outside an HTTP request
// (CLI, queue). Needs a major+ finding in src/ that names ARCH-005 or
// describes the Request payload or the removed properties.
import { reviewCatch } from '../src/grade/review.ts';

export const grade = reviewCatch({
  rule: 'ARCH-005',
  file: 'src/**',
  minSeverity: 'major',
  summary:
    /\bRequest\b|request object|whole request|RequestStack|(removed?|renamed?|dropped|drops|replac\w*)[^.]{0,60}(propert|salesChannelId|customerGroupId)|(propert\w*|salesChannelId|customerGroupId)[^.]{0,60}(removed|renamed|dropped|replaced)|listeners?[^.]{0,60}(break|fail)|breaking|backward.?compat|\bBC\b/iu,
});
