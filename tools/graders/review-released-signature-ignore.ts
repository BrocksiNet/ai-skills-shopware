// Grader: review-released-signature-ignore (sw-review-learnings, REV-036)
// The released route gets its required parameter through the NewRequiredParameter
// marker with a version, and the new route is unreleased with explicit parameters.
// A minor+ finding that names REV-036 or claims an unmarked signature change is a
// false positive.
import { reviewIgnore } from '../src/grade/review.ts';

export const grade = reviewIgnore({
  rule: 'REV-036',
  summary:
    /(NewRequiredParameter|required (\$?\w+ )?parameter|new parameter|deprecat|marker|signature|public api|breaks? (callers|subclasses|existing))/iu,
});
