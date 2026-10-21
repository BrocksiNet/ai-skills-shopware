// Grader: prepare-plugin-for-6-8
// The subject is the review transcript, not a code edit.
import { fail, type Grader, hasLine, verdict } from '../src/grade/kit.ts';

export const grade: Grader = ({ transcript }) => {
  if (transcript === '') return fail('empty transcript');
  const text = transcript.toLowerCase();
  const flag = text.includes('v6_8_0_0');
  const range = hasLine(text, /do not narrow|~6\.6|6\.6 and 6\.7|without dropping/u);
  const behaviors = [/cache/u, /cent|discount|split quantit/u, /document/u, /flow/u].filter((p) =>
    hasLine(text, p),
  ).length;
  const wrong = hasLine(text, /feature_all=1|~6\.8\.0 only|6\.8\.0 only/u);
  return verdict(flag && range && behaviors >= 2 && !wrong, { flag, range, behaviors, wrong });
};
