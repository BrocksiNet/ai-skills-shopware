// Grader: container-if-splits-saas
// The subject is the review transcript, not a code edit.
import { fail, type Grader, hasLine, verdict } from '../src/grade/kit.ts';

export const grade: Grader = ({ transcript }) => {
  if (transcript === '') return fail('empty transcript');
  const text = transcript.toLowerCase();
  const one = hasLine(text, /one container|single container|unified container/u);
  const flag = hasLine(text, /feature flag/u);
  const split = hasLine(text, /compil|different container|splits the container|per feature flag/u);
  const hold = hasLine(text, /do not ship|narrow the design/u);
  const approves = hasLine(text, /ship it|lgtm/u);
  return verdict(one && flag && split && hold && !approves, { one, flag, split, hold, approves });
};
