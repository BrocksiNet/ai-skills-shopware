// What a task grader works with. tools/graders/<task>.ts exports `grade`, a
// function from the agent's workdir and transcript to a verdict. The task's
// grade.sh runs it through tools/bin/grade.ts, which prints `score=1
// (detail)` or `score=0 (detail)` and exits 0 or 1.
//
// The helpers mirror the old shell graders: `grep -q` matched per line, so
// `hasLine` does too; `stripComments` is evals/grade-helpers.sh's perl.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { compareText } from '../text.ts';

export interface TaskRun {
  /** The fixture with the agent's edits. */
  workdir: string;
  /** The agent's answer; empty when there is none. */
  transcript: string;
}

export interface Verdict {
  pass: boolean;
  detail: string;
}

export type Grader = (run: TaskRun) => Verdict;

/** Values that read well in a detail line: `uses_empty=0 explicit=1`. */
type Flag = boolean | number | string;

/** A verdict whose detail lists the flags, booleans as 1 or 0. */
export function verdict(pass: boolean, flags: Record<string, Flag> = {}): Verdict {
  const shown = Object.entries(flags).map(([k, v]) => `${k}=${typeof v === 'boolean' ? Number(v) : v}`);
  return { pass, detail: shown.join(' ') };
}

/** A failing verdict with a reason, like `UserValidator.php not found`. */
export const fail = (detail: string): Verdict => ({ pass: false, detail });

const SKIP_DIRS = new Set(['node_modules', '.git']);

/** Every file below `dir`, sorted, as absolute paths. */
export function filesUnder(dir: string): string[] {
  const out: string[] = [];
  const walk = (d: string): void => {
    for (const e of readdirSync(d, { withFileTypes: true }).toSorted((a, b) => compareText(a.name, b.name))) {
      if (e.isDirectory()) {
        if (!SKIP_DIRS.has(e.name)) walk(join(d, e.name));
      } else if (e.isFile()) out.push(join(d, e.name));
    }
  };
  walk(dir);
  return out;
}

export const read = (path: string): string => readFileSync(path, 'utf8');

/** `grep -q`: some line of `text` matches. */
export const hasLine = (text: string, pattern: RegExp): boolean => text.split('\n').some((l) => pattern.test(l));

/** `grep -c`: the number of lines of `text` that match. */
export const countLines = (text: string, pattern: RegExp): number =>
  text.split('\n').filter((l) => pattern.test(l)).length;

/** `grep -rl --include=*<ext> <needle>`: the first file below `dir` with that
 *  extension whose text holds `needle` (a string or a per-line pattern). */
export function findFile(dir: string, needle: string | RegExp, ext = '.php'): string | undefined {
  return filesUnder(dir).find((f) => {
    if (!f.endsWith(ext)) return false;
    const text = read(f);
    return typeof needle === 'string' ? text.includes(needle) : hasLine(text, needle);
  });
}

/** Files below `dir` whose path relative to it matches `pattern`. */
export function findPaths(dir: string, pattern: RegExp): string[] {
  return filesUnder(dir).filter((f) => pattern.test(f.slice(dir.length + 1)));
}

/** Drops block, Twig and HTML comments and `//` line comments (not `://`
 *  in URLs). PHP `#[...]` attributes stay. */
export function stripComments(text: string): string {
  return text
    .replaceAll(/\/\*[\s\S]*?\*\//gu, '')
    .replaceAll(/\{#[\s\S]*?#\}/gu, '')
    .replaceAll(/<!--[\s\S]*?-->/gu, '')
    .replaceAll(/(?<!:)\/\/[^\n]*/gu, '');
}

/** `tr '\n' ' '`: the text on one line. */
export const flat = (text: string): string => text.replaceAll('\n', ' ');

/** One PHP method, from the line declaring `function <name>(` to the line
 *  closing its body, comments stripped. Empty when there is none. */
export function phpMethod(text: string, name: string): string {
  const start = new RegExp(String.raw`function\s+${name}\s*\(`, 'u');
  const out: string[] = [];
  let grab = false;
  let depth = 0;
  let seen = false;
  for (const line of stripComments(text).split('\n')) {
    if (!grab && start.test(line)) grab = true;
    if (!grab) continue;
    out.push(line);
    for (const c of line) {
      if (c === '{') {
        depth += 1;
        seen = true;
      } else if (c === '}') {
        depth -= 1;
        if (seen && depth <= 0) return `${out.join('\n')}\n`;
      }
    }
  }
  return out.length > 0 ? `${out.join('\n')}\n` : '';
}

const escapeRegex = (s: string): string => s.replaceAll(/[.*+?^${}()|[\]\\]/gu, String.raw`\$&`);

/** The argument list of the first `<name>(...)` call, comments stripped.
 *  Empty when there is no such call. */
export function jsCallArgs(text: string, name: string): string {
  const code = stripComments(text);
  const match = new RegExp(String.raw`${escapeRegex(name)}\s*\(`, 'u').exec(code);
  if (match === null) return '';
  const start = match.index + match[0].length;
  let depth = 1;
  for (let i = start; i < code.length; i += 1) {
    if (code[i] === '(') depth += 1;
    if (code[i] === ')') depth -= 1;
    if (depth === 0) return code.slice(start, i);
  }
  return '';
}
