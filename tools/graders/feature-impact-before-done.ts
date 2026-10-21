// Grader: feature-impact-before-done
// The subject is the review transcript, not a code edit.
import { fail, type Grader, hasLine, verdict } from '../src/grade/kit.ts';

export const grade: Grader = ({ transcript }) => {
  if (transcript === '') return fail('empty transcript');
  const text = transcript.toLowerCase();
  const cache = hasLine(text, /http cache|cache key|vary/u);
  const pays = hasLine(
    text,
    /do not use analytics|does not use analytics|without analytics|never enable analytics|shops that do not/u,
  );
  const complexity = hasLine(text, /more complex|easier/u);
  const hold = hasLine(text, /do not ship|narrow the design/u);
  // "do not ship" contains neither "ship it" nor a bare approval line.
  const approves = hasLine(text, /ship it|lgtm/u);
  return verdict(cache && pays && complexity && hold && !approves, { cache, pays, complexity, hold, approves });
};
