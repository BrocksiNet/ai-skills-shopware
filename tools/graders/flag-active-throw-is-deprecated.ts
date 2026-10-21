// Grader: flag-active-throw-is-deprecated
// The @deprecated tag must sit on the test method, not only the class.
import { fail, findFile, type Grader, hasLine, read, verdict } from '../src/grade/kit.ts';

export const grade: Grader = ({ workdir }) => {
  const file = findFile(workdir, 'function testThrowsWhenMajorActive');
  if (file === undefined) return fail('FlagThrowTest.php not found');
  const preamble = /final class[^{]*\{([\s\S]*?)function testThrowsWhenMajorActive/u.exec(read(file))?.[1] ?? '';
  const tag = preamble.includes('@deprecated tag:v6.9.0');
  const reason = hasLine(preamble, /feature flag|removed with/iu);
  return verdict(tag && reason, { tag, reason });
};
