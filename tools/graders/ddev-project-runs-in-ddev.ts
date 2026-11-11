// Grader: ddev-project-runs-in-ddev (sw-local-dev, DEV-002)
// In a DDEV project, PHPUnit and PHPStan run through `ddev`, not on the
// host, where the database host `db` does not resolve.
import { fail, type Grader, verdict } from '../src/grade/kit.ts';
import { checkScript, hostRun, otherWrappers, runsThrough } from '../src/grade/check-script.ts';

const IN_DDEV = /(^|[\s;&|(])ddev\s+(exec|composer|php)\b/u;

export const grade: Grader = ({ workdir }) => {
  const code = checkScript(workdir);
  if (code === undefined) return fail('scripts/check.sh missing');
  const phpunit = runsThrough(code, IN_DDEV, 'phpunit');
  const phpstan = runsThrough(code, IN_DDEV, 'phpstan');
  const host = hostRun(code, IN_DDEV);
  const others = otherWrappers(code, 'ddev');
  return verdict(phpunit && phpstan && !host && others.length === 0, {
    phpunit_in_ddev: phpunit,
    phpstan_in_ddev: phpstan,
    host_run: host,
    other_wrappers: others.join(',') || 'none',
  });
};
