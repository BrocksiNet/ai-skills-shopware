// Grader: review-feature-flag-env-ignore (sw-review-learnings, REV-016)
// The listing reads NEXT-21530 through Feature::has() and Feature::isActive(),
// the pattern the rule asks for. A finding above nit that names REV-016, or
// claims the flag is read from the environment or bypasses the registry, is a
// false positive.
import { reviewIgnore } from '../src/grade/review.ts';

export const grade = reviewIgnore({
  rule: 'REV-016',
  summary: /(getenv|\$_SERVER|\$_ENV|environment variable|env var|bypass(es)? the (feature|flag) registry)/iu,
});
