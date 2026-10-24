// Grader: review-service-request-ignore (sw-core-development, CORE-053)
// The same exporter, but the controller translates the Request into plain
// values and the service takes arrays and booleans. A minor+ finding that
// names CORE-053 or calls the service tied to the Request is a false positive.
import { reviewIgnore } from '../src/grade/review.ts';

export const grade = reviewIgnore({
  rule: 'CORE-053',
  summary: /\bRequest\b|HttpFoundation|[Hh]exagonal|[Ii]nfrastructure|framework object|plain (?:input|value|argument)/u,
});
