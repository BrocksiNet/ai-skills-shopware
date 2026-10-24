// Grader: review-environment-probe-catch (sw-core-development, CORE-073)
// The cache factory picks APCu from ini_get() and function_exists(), so web and
// CLI processes on the same version can run different cache backends. Needs a
// major+ finding in src/Core/ that names CORE-073 or describes the
// environment-dependent behaviour.
import { reviewCatch } from '../src/grade/review.ts';

export const grade = reviewCatch({
  rule: 'CORE-073',
  file: 'src/Core/**',
  minSeverity: 'major',
  summary:
    /same version|two (shops|installs)|differ(s|ent)? (between|per) (shops?|installs?|hosts?|servers?|environments?)|environment[- ]dependent|per[- ](host|server|environment)|hosting (setup|variant)/iu,
});
