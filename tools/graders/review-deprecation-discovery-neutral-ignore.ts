// Grader: review-deprecation-discovery-neutral-ignore (sw-core-development, CORE-012)
// The same deprecated subscriber, with getSubscribedEvents() returning [] once
// the removal flag is active. A minor+ finding that names CORE-012 or calls the
// neutral return a throw is a false positive.
import { reviewIgnore } from '../src/grade/review.ts';

export const grade = reviewIgnore({
  rule: 'CORE-012',
  summary: /throw|neutral|discovery|return \[\]|empty array/iu,
});
