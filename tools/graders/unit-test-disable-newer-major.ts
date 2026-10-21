// Grader: unit-test-disable-newer-major
import { fail, findFile, type Grader, hasLine, read, stripComments, verdict } from '../src/grade/kit.ts';

export const grade: Grader = ({ workdir }) => {
  const file = findFile(workdir, 'CartRoundingTest');
  if (file === undefined) return fail('CartRoundingTest.php not found');
  const code = stripComments(read(file));
  const disable = hasLine(code, /#\[DisabledFeatures\(\[.*v6\.9\.0\.0/u);
  const fake = hasLine(code, /Feature::fake\s*\(/u);
  return verdict(disable && !fake, { disable, fake });
};
