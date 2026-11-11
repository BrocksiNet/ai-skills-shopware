// Shared by the local-environment tasks (sw-local-dev): each fixes
// `scripts/check.sh` so PHPUnit and PHPStan run where the project runs.
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { read } from './kit.ts';

/** The commands of `scripts/check.sh`: comments and blank lines dropped,
 *  continued lines (`\` at the end) joined. Undefined when the file is
 *  missing or empty. */
export function checkScript(workdir: string): string | undefined {
  const file = join(workdir, 'scripts/check.sh');
  if (!existsSync(file)) return undefined;
  const code = read(file)
    .replaceAll('\\\n', ' ')
    .split('\n')
    .map((l) => l.replace(/(^|\s)#.*$/u, ''))
    .filter((l) => !/^\s*$/u.test(l))
    .join('\n');
  return code === '' ? undefined : code;
}

/** A PHP tool named on a line. */
export const PHP_TOOL = /(^|[\s;&|("])(php|composer|phpunit|vendor\/bin\/[a-z-]+|bin\/console)(\s|$)/u;

/** Whether a line runs a PHP tool without going through `wrapped`. */
export const hostRun = (code: string, wrapped: RegExp): boolean =>
  code.split('\n').some((l) => !wrapped.test(l) && PHP_TOOL.test(l));

/** Lines that run `tool` (phpunit, phpstan) through `wrapped`. */
export const runsThrough = (code: string, wrapped: RegExp, tool: string): boolean =>
  code.split('\n').some((l) => wrapped.test(l) && l.includes(tool));

/** Wrappers of the other environments, by name. */
export const WRAPPERS: Record<string, RegExp> = {
  ddev: /(^|[\s;&|(])ddev\s/u,
  docker: /(^|[\s;&|(])docker([ -]compose)?\s/u,
  vagrant: /(^|[\s;&|(])vagrant\s/u,
  podman: /(^|[\s;&|(])podman([ -]compose)?\s/u,
};

/** The other environments' wrappers a script uses. */
export const otherWrappers = (code: string, own: string): string[] =>
  Object.entries(WRAPPERS)
    .filter(([name, re]) => name !== own && re.test(code))
    .map(([name]) => name);
