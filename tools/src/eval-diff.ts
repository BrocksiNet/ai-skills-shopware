// Compare two A/B result sets, baseline vs new (plan WP1; ported from
// scripts/eval-diff.sh in WP10). A report, not a gate.
//
// Lists tasks whose verdict or skill-on pass rate changed, plus added and
// removed tasks. When both sets have token counts for a task, a second table
// compares the average skill-on tokens per run.
import { type AbResult, type Tokens, hasTokens, latestPerTask } from './eval-results.ts';
import { compareText } from './text.ts';

const byTask = (results: AbResult[]): Map<string, AbResult> => new Map(latestPerTask(results).map((r) => [r.task, r]));
const total = (t: Tokens): number => t.input + t.output;
const showTokens = (t: Tokens): string => `${t.input} / ${t.output}`;
const showRun = (r: AbResult): string => `${r.verdict} ${r.on}/${r.repeats}`;

/** Percent change with one decimal, rounded half away from zero. */
export function changePct(before: number, after: number): number {
  const tenths = ((after - before) * 1000) / before;
  return (Math.sign(tenths) * Math.round(Math.abs(tenths))) / 10;
}

export function diff(oldResults: AbResult[], newResults: AbResult[]): string {
  const old = byTask(oldResults);
  const now = byTask(newResults);
  const tasks = [...new Set([...old.keys(), ...now.keys()])].toSorted(compareText);

  const rows: string[] = [];
  const tokenRows: string[] = [];
  for (const t of tasks) {
    const o = old.get(t);
    const n = now.get(t);
    if (o === undefined && n !== undefined) rows.push(`| \`${t}\` | (new) | ${showRun(n)} |`);
    else if (n === undefined && o !== undefined) rows.push(`| \`${t}\` | ${showRun(o)} | (removed) |`);
    else if (o !== undefined && n !== undefined) {
      // Same pass rate across different repeat counts is not a change.
      if (o.verdict !== n.verdict || o.on * n.repeats !== n.on * o.repeats)
        rows.push(`| \`${t}\` | ${showRun(o)} | ${showRun(n)} |`);
      if (hasTokens(o.tokens_on) && hasTokens(n.tokens_on) && total(o.tokens_on) > 0) {
        const change = changePct(total(o.tokens_on), total(n.tokens_on));
        tokenRows.push(`| \`${t}\` | ${showTokens(o.tokens_on)} | ${showTokens(n.tokens_on)} | ${change} % |`);
      }
    }
  }

  const out = ['### Changes since baseline', ''];
  if (rows.length === 0) out.push('No task changed its verdict or skill-on pass rate.');
  else out.push('| Task | Before | After |', '| ---- | ------ | ----- |', ...rows);
  if (tokenRows.length > 0) {
    out.push(
      '',
      '### Tokens per skill-on run',
      '',
      'Average input / output tokens. Input includes cache reads and writes.',
      '',
      '| Task | Before | After | Change (total) |',
      '| ---- | ------ | ----- | -------------- |',
      ...tokenRows,
    );
  }
  return out.join('\n');
}
