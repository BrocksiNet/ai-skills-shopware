// Grader: admin-sfc-not-a-6-8-migration
// The subject is the review transcript, not a code edit.
import { fail, type Grader, hasLine, verdict } from '../src/grade/kit.ts';

export const grade: Grader = ({ transcript }) => {
  if (transcript === '') return fail('empty transcript');
  const text = transcript.toLowerCase();
  const experimental = hasLine(text, /experimental|discussion|preview/u);
  const keepTwig = hasLine(text, /twig/u);
  const notRequired = hasLine(text, /not required|not the upgrade|do not rewrite|still works/u);
  const rewrites = hasLine(text, /6\.8 requires|swdefineoverride\(\{/u);
  return verdict(experimental && keepTwig && notRequired && !rewrites, {
    experimental,
    keep_twig: keepTwig,
    not_required: notRequired,
    rewrites,
  });
};
