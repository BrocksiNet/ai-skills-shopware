// Grader: test-no-exit-die
import { fail, findFile, flat, type Grader, hasLine, read, stripComments, verdict } from '../src/grade/kit.ts';

export const grade: Grader = ({ workdir }) => {
  const file = findFile(workdir, 'ConsoleCommandTest');
  if (file === undefined) return fail('ConsoleCommandTest.php not found');
  const code = stripComments(read(file));
  const oneLine = flat(code);
  const auto = hasLine(oneLine, /->setAutoExit\s*\(\s*false\s*\)/u);
  const run = hasLine(oneLine, /->run\s*\(/u);
  // Default auto-exit kills PHPUnit if run() happens first.
  const order = hasLine(oneLine, /setAutoExit\s*\(\s*false\s*\).*->run\s*\(/u);
  const kill = hasLine(code, /\b(exit|die)\b/u);
  const keepsAssert = hasLine(oneLine, /assert(True|Same)\s*\([^;]*->has\s*\(\s*['"]swag:example:dump['"]/u);
  return verdict(auto && run && order && !kill && keepsAssert, { auto, run, order, kill, assert: keepsAssert });
};
