// Grader: review-extension-event-request-payload-ignore (sw-architecture, ARCH-005)
// The event gains an optional campaignCode property next to the existing
// ones. A minor+ finding that names ARCH-005 or calls the event change
// breaking is a false positive.
import { reviewIgnore } from '../src/grade/review.ts';

export const grade = reviewIgnore({
  rule: 'ARCH-005',
  summary:
    /\bRequest\b|request object|whole request|RequestStack|(removed?|renamed?|dropped|drops|replac\w*)[^.]{0,60}(propert|salesChannelId|customerGroupId)|(propert\w*|salesChannelId|customerGroupId)[^.]{0,60}(removed|renamed|dropped|replaced)|listeners?[^.]{0,60}(break|fail)|breaking|backward.?compat|\bBC\b/iu,
});
