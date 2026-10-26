// Grader: review-environment-probe-ignore (sw-core-development, CORE-073)
// The same cache factory, but the APCu choice comes from a documented config
// key and the factory fails at boot when APCu is requested but not loaded. A
// minor+ finding that names CORE-073 or describes environment-dependent
// behaviour is a false positive.
import { reviewIgnore } from '../src/grade/review.ts';

export const grade = reviewIgnore({
  rule: 'CORE-073',
  summary:
    /same version|two (shops|installs)|differ(s|ent)? (between|per) (shops?|installs?|hosts?|servers?|environments?)|environment[- ]dependent|per[- ](host|server|environment)|hosting (setup|variant)/iu,
});
