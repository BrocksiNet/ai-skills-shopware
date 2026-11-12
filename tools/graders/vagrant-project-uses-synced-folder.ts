// Grader: vagrant-project-uses-synced-folder (sw-local-dev, DEV-004)
// The Vagrantfile defines two machines, `db` and `app`, with no primary, and
// syncs the project to /var/www/shopware on `app` by rsync. PHPUnit and
// PHPStan run through `vagrant ssh app -c` after a `cd` to that folder, and
// `vagrant rsync` runs first so the VM sees the code on disk.
import { fail, type Grader, hasLine, verdict } from '../src/grade/kit.ts';
import { checkScript, hostRun, otherWrappers, runsThrough } from '../src/grade/check-script.ts';

const SSH = /(^|[\s;&|(])vagrant\s+ssh\b/u;
const IN_APP =
  /(^|[\s;&|(])vagrant\s+ssh\s+app\b.*(-c|--command)[\s=]+["'][^"']*\bcd\s+["']?\/var\/www\/shopware\/?["']?\s*(&&|;)/u;
const RSYNC = /(^|[\s;&|(])vagrant\s+rsync(\s+app)?\s*$/u;
const DEFAULT_FOLDER = /\bcd\s+["']?\/vagrant\b/u;

export const grade: Grader = ({ workdir }) => {
  const code = checkScript(workdir);
  if (code === undefined) return fail('scripts/check.sh missing');
  const lines = code.split('\n');
  const firstSsh = lines.findIndex((l) => SSH.test(l));
  const rsyncAt = lines.findIndex((l) => RSYNC.test(l));
  const phpunit = runsThrough(code, IN_APP, 'phpunit');
  const phpstan = runsThrough(code, IN_APP, 'phpstan');
  const rsyncFirst = rsyncAt !== -1 && (firstSsh === -1 || rsyncAt < firstSsh);
  const defaultFolder = hasLine(code, DEFAULT_FOLDER);
  const host = hostRun(code, IN_APP);
  const others = otherWrappers(code, 'vagrant');
  return verdict(phpunit && phpstan && rsyncFirst && !defaultFolder && !host && others.length === 0, {
    phpunit_in_app: phpunit,
    phpstan_in_app: phpstan,
    rsync_first: rsyncFirst,
    cd_vagrant: defaultFolder,
    host_run: host,
    other_wrappers: others.join(',') || 'none',
  });
};
