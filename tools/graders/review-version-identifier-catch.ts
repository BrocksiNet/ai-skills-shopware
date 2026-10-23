// Grader: review-version-identifier-catch (sw-core-development, CORE-078)
// The deprecation tags and triggers with the three-part v6.8.0, which maps to
// no flag, so it never fires. Needs a major+ finding in src/ that names
// CORE-078 or describes the wrong version form.
import { reviewCatch } from '../src/grade/review.ts';

export const grade = reviewCatch({
  rule: 'CORE-078',
  file: 'src/**',
  minSeverity: 'major',
  summary: /three-part|four-part|minor-only|unprefixed|v6\.8\.0(?!\.0)|wrong (flag|release)|vX\.Y\.Z\.0/iu,
});
