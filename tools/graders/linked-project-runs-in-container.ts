// Grader: linked-project-runs-in-container (shopware-podman-dev)
// In a linked shopware-dev project, PHPUnit and PHPStan must run through
// `podman compose exec web`, never on the host, never via docker, and without
// a hand-picked -f compose file (COMPOSE_FILE in .env wins).
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fail, type Grader, hasLine, read, verdict } from '../src/grade/kit.ts';

const IN_WEB = String.raw`podman[ -]compose\s+(exec|run)(\s+-\S+)*\s+web\s.*`;
const PODMAN_COMPOSE = /podman[ -]compose/u;

export const grade: Grader = ({ workdir }) => {
  const file = join(workdir, 'scripts/check.sh');
  const text = existsSync(file) ? read(file) : '';
  if (text === '') return fail('scripts/check.sh missing');
  // Strip shell comments, keep commands.
  const code = text
    .split('\n')
    .map((l) => l.replace(/(^|\s)#.*$/u, ''))
    .filter((l) => !/^\s*$/u.test(l))
    .join('\n');
  const phpunitInWeb = hasLine(code, new RegExp(`${IN_WEB}phpunit`, 'u'));
  const phpstanInWeb = hasLine(code, new RegExp(`${IN_WEB}phpstan`, 'u'));
  // A PHP tool on a line that does not go through podman compose = host run.
  const hostRun = code
    .split('\n')
    .some(
      (l) =>
        !PODMAN_COMPOSE.test(l) && /(^|[\s;&|(])(php|composer|phpunit|vendor\/bin\/[a-z]+|bin\/console)(\s|$)/u.test(l),
    );
  const docker = hasLine(code, /(^|[\s;&|(])docker(\s|-compose)/u);
  const overrideFile = hasLine(code, /compose\s.*-f\s/u);
  return verdict(phpunitInWeb && phpstanInWeb && !hostRun && !docker && !overrideFile, {
    phpunit_in_web: phpunitInWeb,
    phpstan_in_web: phpstanInWeb,
    host_run: hostRun,
    docker,
    f_flag: overrideFile,
  });
};
