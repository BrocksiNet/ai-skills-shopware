// Grader: review-version-identifier-ignore (sw-core-development, CORE-078)
// The same deprecation written with the four-part v6.8.0.0 form, plus a
// changelog sentence that names a minor release. A non-nit finding that calls
// the four-part form wrong is a false positive.
import { reviewIgnore } from '../src/grade/review.ts';

export const grade = reviewIgnore({
  rule: 'CORE-078',
  summary: /three-part|four-part|minor-only|unprefixed|v6\.8\.0(?!\.0)|wrong (flag|release)/iu,
});
