// Grader: unit-test-passes
// PASS when a unit-style PHPUnit test exists (TestCase, assertSame, data
// provider, no kernel/DB — checked on comment-stripped code) and, if phpunit
// + composer are available, it runs green.
import { spawnSync } from 'node:child_process';
import { accessSync, constants } from 'node:fs';
import { join } from 'node:path';
import { fail, findFile, type Grader, hasLine, read, stripComments, verdict } from '../src/grade/kit.ts';

function isExecutable(path: string): boolean {
  try {
    accessSync(path, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

export const grade: Grader = ({ workdir }) => {
  const testFile = findFile(workdir, 'PriceCalculatorTest');
  if (testFile === undefined) return fail('PriceCalculatorTest.php not found');
  const raw = read(testFile);
  const code = stripComments(raw);
  const dataProvider =
    hasLine(code, /#\[(?:\\?PHPUnit\\Framework\\Attributes\\)?DataProvider\s*\(/u) ||
    hasLine(raw, /\*\s*@dataProvider\s+\w+/u);
  const structural =
    hasLine(code, /\bextends\s+\\?(?:PHPUnit\\Framework\\)?TestCase\b/u) &&
    hasLine(code, /assertSame\s*\(/u) &&
    dataProvider &&
    // unit test must not pull in the kernel / DB
    !hasLine(code, /IntegrationTestBehaviour|KernelTestBehaviour|getContainer\s*\(/u);

  let ran = 'skipped';
  const phpunit = join(workdir, 'vendor/bin/phpunit');
  if (isExecutable(phpunit)) {
    ran = spawnSync(phpunit, [testFile], { cwd: workdir, stdio: 'ignore' }).status === 0 ? 'pass' : 'fail';
  }

  return verdict(structural && ran !== 'fail', { structural, phpunit: ran });
};
