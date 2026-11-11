// Lint configs on trunk (plan 2026-11 WP A step 3): the rule settings a
// commit adds to or removes from an ESLint, Stylelint or ludtwig config. A
// rule the catalog lists as already enforced goes stale when such a config
// drops the check; this is how the drift report notices.
import type { Change, LineDelta } from './trunk-deltas.ts';

/** ESLint, Stylelint and ludtwig configs, by file name. */
export const LINT_CONFIG =
  /(?:^|\/)(?:eslint\.config\.[cm]?[jt]s|\.eslintrc(?:\.[a-z]+)?|stylelint\.config\.[cm]?[jt]s|\.stylelintrc(?:\.[a-z]+)?|ludtwig-config\.toml)$/u;

const LEVEL = String.raw`(?<level>off|warn|error|[0-2]|true|false|null)`;
const RULE = String.raw`(['"]?)(?<rule>[@\w./-]+)\1\s*:\s*`;
/** A rule set to a level in ESLint (`'rule': 'error'`, `rule: [2, …]`) or
 *  Stylelint (`"rule": true`, `[null, …]`): the rule and its level. */
const SETTING = new RegExp(String.raw`^\s*${RULE}\[?\s*(['"]?)${LEVEL}\3(?![\w-])`, 'u');
/** A setting that opens an array and gives the level on the next line. */
const OPEN = new RegExp(String.raw`^\s*${RULE}\[\s*$`, 'u');
/** The level alone at the start of a line. */
const LEVEL_LINE = new RegExp(String.raw`^\s*(['"]?)${LEVEL}\1(?![\w-])`, 'u');
/** A ludtwig `active-rules` entry: a quoted rule name alone on its line. */
const LUDTWIG_RULE = /^\s*"(?<rule>[a-z0-9-]+)"\s*,?\s*$/u;

/** Drops a line removed and added again unchanged, as when lines move. */
export function withoutMoves(lines: LineDelta[]): LineDelta[] {
  const keys = new Set(lines.map((l) => `${l.change}${l.text}`));
  return lines.filter((l) => !keys.has(`${l.change === '+' ? '-' : '+'}${l.text}`));
}

const sidesOf = (line: string): Change[] => {
  if (line.startsWith('-')) return ['-'];
  if (line.startsWith('+')) return ['+'];
  return ['-', '+'];
};

/** The rule settings a lint config patch adds or removes, as `rule: level`
 *  (ESLint, Stylelint) or the rule name (a ludtwig `active-rules` entry). A
 *  setting may open an array and give the level on the next line; then a
 *  change to either line counts. A changed level is one removed and one
 *  added line; a moved setting cancels out. */
export function lintRuleLines(file: string, patch: string): LineDelta[] {
  const toml = file.endsWith('.toml');
  const lines: LineDelta[] = [];
  /** The rule of an `'rule': [` line, per diff side, waiting for its level. */
  const open = new Map<Change, { rule: string; changed: boolean }>();
  for (const line of patch.split('\n')) {
    if (line.startsWith('@@ ')) {
      open.clear();
      continue;
    }
    const text = line.slice(1);
    const changed = line.startsWith('+') || line.startsWith('-');
    const setting = (toml ? LUDTWIG_RULE : SETTING).exec(text)?.groups;
    const opened = toml ? undefined : OPEN.exec(text)?.groups?.rule;
    for (const side of sidesOf(line)) {
      const pending = open.get(side);
      open.delete(side);
      if (opened !== undefined) {
        open.set(side, { rule: opened, changed });
        continue;
      }
      const level = pending === undefined ? setting?.level : LEVEL_LINE.exec(text)?.groups?.level;
      const rule = pending?.rule ?? setting?.rule;
      if (rule === undefined || (pending !== undefined && level === undefined)) continue;
      if (!changed && pending?.changed !== true) continue;
      lines.push({ file, change: side, text: level === undefined ? rule : `${rule}: ${level}` });
    }
  }
  return withoutMoves(lines);
}
