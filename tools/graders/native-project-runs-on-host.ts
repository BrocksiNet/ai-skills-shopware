// Grader: native-project-runs-on-host (sw-local-dev, DEV-005)
// No container or VM: the script was copied from a Docker project. PHPUnit
// and PHPStan run directly on the host, with no environment wrapper.
import { fail, type Grader, verdict } from '../src/grade/kit.ts';
import { checkScript, otherWrappers, PHP_TOOL } from '../src/grade/check-script.ts';

const runs = (code: string, tool: string): boolean =>
  code.split('\n').some((l) => PHP_TOOL.test(l) && l.includes(tool));

export const grade: Grader = ({ workdir }) => {
  const code = checkScript(workdir);
  if (code === undefined) return fail('scripts/check.sh missing');
  const phpunit = runs(code, 'phpunit');
  const phpstan = runs(code, 'phpstan');
  const wrappers = otherWrappers(code, 'native');
  return verdict(phpunit && phpstan && wrappers.length === 0, {
    phpunit,
    phpstan,
    wrappers: wrappers.join(',') || 'none',
  });
};
