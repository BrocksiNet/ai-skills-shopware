// Grader: review-route-response-shape-ignore (sw-plugin-development, PLG-012)
// The route returns a LoyaltyHistoryStruct whose fields are documented in its
// docblocks, so the response shape is stable. A minor+ finding that names
// PLG-012 or calls the response an untyped shape is a false positive.
import { reviewIgnore } from '../src/grade/review.ts';

export const grade = reviewIgnore({
  rule: 'PLG-012',
  summary:
    /untyped|ad.?hoc|raw array|plain array|associative array|typed (struct|dto|response)|response shape|documented fields/iu,
});
