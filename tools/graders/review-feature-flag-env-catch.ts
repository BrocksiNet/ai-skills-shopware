// Grader: review-feature-flag-env-catch (sw-review-learnings, REV-016)
// The listing reads FEATURE_NEXT_21530 with getenv(), so the Feature registry
// never sees the flag: a graduated flag is silently off, and Feature::has()
// is the guard that makes the check safe. Needs a minor+ finding in src/ that
// names REV-016 or describes the missed Feature::has() guard.
import { reviewCatch } from '../src/grade/review.ts';

export const grade = reviewCatch({
  rule: 'REV-016',
  file: 'src/**',
  minSeverity: 'minor',
  summary: /(Feature::has|E_USER_WARNING|unregistered flag|graduat)/iu,
});
