// Grader: docker-project-uses-compose-service (sw-local-dev, DEV-003)
// The project's AGENTS.local.md is core's Docker template, which names a
// container `shopware_app`. compose.yaml defines only the service `web`, so
// PHPUnit and PHPStan must run through `docker compose exec|run … web`.
import { fail, type Grader, hasLine, verdict } from '../src/grade/kit.ts';
import { checkScript, hostRun, otherWrappers, runsThrough } from '../src/grade/check-script.ts';

const IN_WEB = /(^|[\s;&|(])docker[ -]compose\s.*\b(exec|run)\s+(-\S+\s+)*web\s/u;
const TEMPLATE_NAME = /\bshopware_(app|node)\b/u;

export const grade: Grader = ({ workdir }) => {
  const code = checkScript(workdir);
  if (code === undefined) return fail('scripts/check.sh missing');
  const phpunit = runsThrough(code, IN_WEB, 'phpunit');
  const phpstan = runsThrough(code, IN_WEB, 'phpstan');
  const template = hasLine(code, TEMPLATE_NAME);
  const host = hostRun(code, IN_WEB);
  const others = otherWrappers(code, 'docker');
  return verdict(phpunit && phpstan && !template && !host && others.length === 0, {
    phpunit_in_web: phpunit,
    phpstan_in_web: phpstan,
    template_container: template,
    host_run: host,
    other_wrappers: others.join(',') || 'none',
  });
};
