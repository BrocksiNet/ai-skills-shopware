// Grader: unit-test-passes
// PASS when a unit-style PHPUnit test exists (TestCase, assertSame, data
// provider, no kernel/DB) and, if phpunit + composer are available, it runs green.
import { spawnSync } from 'node:child_process';
import { accessSync, constants } from 'node:fs';
import { join } from 'node:path';
import { fail, findFile, type Grader, hasLine, read, verdict } from '../src/grade/kit.ts';

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
  const text = read(testFile);
  const structural =
    hasLine(text, /extends\s+TestCase/u) &&
    hasLine(text, /assertSame/u) &&
    hasLine(text, /DataProvider/iu) &&
    // unit test must not pull in the kernel / DB
    !hasLine(text, /IntegrationTestBehaviour|KernelTestBehaviour|getContainer\(/u);

  let ran = 'skipped';
  const phpunit = join(workdir, 'vendor/bin/phpunit');
  if (isExecutable(phpunit)) {
    ran = spawnSync(phpunit, [testFile], { cwd: workdir, stdio: 'ignore' }).status === 0 ? 'pass' : 'fail';
  }

  return verdict(structural && ran !== 'fail', { structural, phpunit: ran });
};
