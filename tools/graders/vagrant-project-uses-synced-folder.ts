// Grader: vagrant-project-uses-synced-folder (sw-local-dev, DEV-004)
// The Vagrantfile syncs the project to /var/www/shopware, not /vagrant as
// core's template says. PHPUnit and PHPStan run through `vagrant ssh -c`
// after a `cd` to that folder.
import { fail, type Grader, hasLine, verdict } from '../src/grade/kit.ts';
import { checkScript, hostRun, otherWrappers, runsThrough } from '../src/grade/check-script.ts';

const IN_VM =
  /(^|[\s;&|(])vagrant\s+ssh\b.*(-c|--command)[\s=]+["'][^"']*\bcd\s+["']?\/var\/www\/shopware\/?["']?\s*(&&|;)/u;
const DEFAULT_FOLDER = /\bcd\s+["']?\/vagrant\b/u;

export const grade: Grader = ({ workdir }) => {
  const code = checkScript(workdir);
  if (code === undefined) return fail('scripts/check.sh missing');
  const phpunit = runsThrough(code, IN_VM, 'phpunit');
  const phpstan = runsThrough(code, IN_VM, 'phpstan');
  const defaultFolder = hasLine(code, DEFAULT_FOLDER);
  const host = hostRun(code, IN_VM);
  const others = otherWrappers(code, 'vagrant');
  return verdict(phpunit && phpstan && !defaultFolder && !host && others.length === 0, {
    phpunit_in_vm: phpunit,
    phpstan_in_vm: phpstan,
    cd_vagrant: defaultFolder,
    host_run: host,
    other_wrappers: others.join(',') || 'none',
  });
};
