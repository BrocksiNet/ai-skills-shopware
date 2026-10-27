// Grader: admin-sfc-not-a-6-8-migration (ADM-005)
// The subject is the review transcript, not a code edit.
import { fail, flat, type Grader, hasLine, verdict } from '../src/grade/kit.ts';

const NEGATION = /\b(not|no|never|wrong|false|incorrect|myth|claim\w*|isn't|doesn't|don't)\b|n't\b/u;

/** Sentences of `text` across line breaks; a dot between digits (6.8) does
 *  not end one. */
const sentences = (text: string): string[] => flat(text).split(/(?<!\d)[.!?](?!\d)/u);

export const grade: Grader = ({ transcript }) => {
  if (transcript === '') return fail('empty transcript');
  const text = transcript.toLowerCase();
  const experimental = hasLine(text, /experimental|discussion|preview/u);
  const keepTwig = hasLine(text, /twig/u);
  const notRequired = hasLine(text, /not required|not the upgrade|do not rewrite|still works/u);
  // Rewriting the override, or repeating the claim without negating it.
  const affirmsClaim = sentences(text).some((s) => /6\.8 requires/u.test(s) && !NEGATION.test(s));
  const rewrites = affirmsClaim || hasLine(text, /swdefineoverride\(\{/u);
  return verdict(experimental && keepTwig && notRequired && !rewrites, {
    experimental,
    keep_twig: keepTwig,
    not_required: notRequired,
    rewrites,
  });
};
