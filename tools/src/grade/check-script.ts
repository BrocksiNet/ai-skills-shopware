// Shared by the local-environment tasks (sw-local-dev): each fixes
// `scripts/check.sh` so PHPUnit and PHPStan run where the project runs.
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { read } from './kit.ts';

const ASSIGN = /^\s*(?:export\s+|readonly\s+|local\s+)?([A-Za-z_]\w*)=(?:"([^"$`]*)"|'([^']*)'|([^"'\s$`]*))\s*$/u;

/** `$NAME` and `${NAME}` replaced by plain values assigned in the script,
 *  quoted values with spaces included (`APP="docker compose exec web"`). */
function expandVariables(lines: string[]): string[] {
  const vars = new Map<string, string>();
  for (const l of lines) {
    const m = ASSIGN.exec(l);
    const value = m?.[2] ?? m?.[3] ?? m?.[4];
    if (m?.[1] !== undefined && value !== undefined) vars.set(m[1], value);
  }
  return lines.map((l) => l.replaceAll(/\$\{?([A-Za-z_]\w*)\}?/gu, (all, name: string) => vars.get(name) ?? all));
}

const FN_ONE_LINE = /^\s*(?:function\s+)?([A-Za-z_]\w*)\s*\(\)\s*\{(.*)\}\s*;?\s*$/u;
const FN_START = /^\s*(?:function\s+)?([A-Za-z_]\w*)\s*\(\)\s*\{\s*$/u;
const PASSES_ARGS = /"?\$[@*]"?/u;

const braces = (l: string): number => (l.match(/\{/gu) ?? []).length - (l.match(/\}/gu) ?? []).length;

/** Function definitions dropped, and each call replaced by every command in
 *  the function's bodies that passes `"$@"` on. A function defined twice
 *  (an if/else) or with a branch keeps all of them, so a host fallback
 *  still shows up as a host run. */
function inlineFunctions(lines: string[]): string[] {
  const bodies = new Map<string, string[]>();
  const rest: string[] = [];
  const add = (name: string, cmds: string[]): void => {
    bodies.set(name, [...(bodies.get(name) ?? []), ...cmds.filter((c) => PASSES_ARGS.test(c))]);
  };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? '';
    const one = FN_ONE_LINE.exec(line);
    if (one?.[1] !== undefined && one[2] !== undefined) {
      add(one[1], one[2].split(';'));
      continue;
    }
    const start = FN_START.exec(line);
    if (start?.[1] === undefined) {
      rest.push(line);
      continue;
    }
    const body: string[] = [];
    let depth = 1;
    for (i++; i < lines.length; i++) {
      const b = lines[i] ?? '';
      depth += braces(b);
      if (depth <= 0) break;
      body.push(b);
    }
    add(start[1], body);
  }
  return rest.flatMap((line) => {
    const call = /^(\s*)([A-Za-z_]\w*)(\s.*)?$/u.exec(line);
    const cmds = call?.[2] === undefined ? undefined : bodies.get(call[2]);
    if (cmds === undefined || cmds.length === 0) return [line];
    const args = (call?.[3] ?? '').trim();
    return cmds.map((c) => c.replace(PASSES_ARGS, args).trim());
  });
}

type Side = 'inside' | 'outside' | undefined;

/** Which branch of an `if` on `inside` runs inside the environment:
 *  `[ "$IS_DDEV_PROJECT" = true ]` and `-n` test for inside, `!=`, `-z`
 *  and a leading `!` for outside. Undefined when the line does not test it. */
function sideOf(line: string, inside: RegExp): Side {
  if (!inside.test(line)) return undefined;
  const negated = /!=|-z\s|\b(?:el)?if\s+!\s/u.test(line);
  return negated ? 'outside' : 'inside';
}

/** Lines in the branch of an `if` that runs inside the environment dropped:
 *  a plain command there is not a host run. Other `if`s are kept as they
 *  are, so a `command -v` fallback still counts. */
function dropInsideBranches(lines: string[], inside: RegExp): string[] {
  const stack: { side: Side; inElse: boolean }[] = [];
  const isInside = (): boolean =>
    stack.some((f) => (f.side === 'inside' && !f.inElse) || (f.side === 'outside' && f.inElse));
  const kept: string[] = [];
  for (const line of lines) {
    const top = stack.at(-1);
    if (/^\s*if\s/u.test(line)) {
      if (!isInside()) kept.push(line);
      stack.push({ side: sideOf(line, inside), inElse: false });
    } else if (top !== undefined && /^\s*elif\s/u.test(line)) {
      stack.pop();
      if (!isInside()) kept.push(line);
      stack.push({ side: sideOf(line, inside), inElse: false });
    } else if (top !== undefined && /^\s*else\b/u.test(line)) {
      top.inElse = true;
    } else if (top !== undefined && /^\s*fi\b/u.test(line)) {
      stack.pop();
    } else if (!isInside()) {
      kept.push(line);
    }
  }
  return kept;
}

/** The commands of `scripts/check.sh`: comments and blank lines dropped,
 *  continued lines (`\` at the end) joined, shell variables set in the
 *  script expanded, and calls to helper functions replaced by the commands
 *  that pass the arguments on (`"$@"`). With `inside`, a test for being
 *  inside the environment (`IS_DDEV_PROJECT`), the branch that runs there
 *  is dropped. Undefined when the file is missing or empty. */
export function checkScript(workdir: string, inside?: RegExp): string | undefined {
  const file = join(workdir, 'scripts/check.sh');
  if (!existsSync(file)) return undefined;
  const lines = read(file)
    .replaceAll('\\\n', ' ')
    .split('\n')
    .map((l) => l.replace(/(^|\s)#.*$/u, ''))
    .filter((l) => !/^\s*$/u.test(l));
  const branches = inside === undefined ? lines : dropInsideBranches(lines, inside);
  const code = inlineFunctions(expandVariables(branches)).join('\n');
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
