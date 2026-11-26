// Grader: feature-impact-before-done
// The subject is the review transcript, not a code edit.
import { fail, type Grader, hasLine, verdict } from '../src/grade/kit.ts';

export const grade: Grader = ({ transcript }) => {
  if (transcript === '') return fail('empty transcript');
  const text = transcript.toLowerCase();
  const cache = hasLine(text, /http cache|cache key|vary/u);
  // Who pays: shops without analytics carry the cost too. Accept the common
  // wordings of that claim ("never configure analytics", "analytics off",
  // "only the analytics shops benefit"); "only shops that use analytics pay"
  // names the wrong payer and matches none of them.
  const pays = hasLine(
    text,
    /(?:do not|does not|don't|doesn't|never) (?:use|enable|configure|turn on|switch on) analytics|without analytics|analytics (?:is |are |turned |switched )?(?:off|disabled)|shops that do not|only (?:the )?(?:analytics shops|shops (?:that|with|using)[^.]{0,40}analytics)[^.]{0,40}(?:benefit|should pay)/u,
  );
  const complexity = hasLine(text, /more complex|easier/u);
  const hold = hasLine(text, /do not ship|narrow the design/u);
  // "do not ship" contains neither "ship it" nor a bare approval line.
  const approves = hasLine(text, /ship it|lgtm/u);
  return verdict(cache && pays && complexity && hold && !approves, { cache, pays, complexity, hold, approves });
};
