// Gate and summarize A/B results (plan WP1; ported from scripts/eval-gate.sh
// in WP10). The output is Markdown for $GITHUB_STEP_SUMMARY.
//
// Gates:
//   - no task is "worse" (skill on passed fewer runs than skill off)
//   - of the tasks with a verdict, at least minPassPct % pass every run with
//     the skill on
//   - at most maxErrorPct % of tasks ended in agent errors; more means the
//     provider failed, not the skills
//   - at least minLoadPct % of skill-on runs loaded one of the task's skills.
//     Below that the model ignores the skills and "on" equals "off".
//   - no skill-off run loaded a repo skill (skills leaked into the baseline)
// The two skill-load gates only count records whose adapter reports loads.
// "held" and "no_difference" tasks are warnings: candidates for a sharper
// eval or for removing the rule.
import {
  type AbResult,
  hasTokens,
  isNumber,
  latestPerTask,
  offDone,
  onDone,
  pct,
  VERDICTS,
  type Verdict,
} from './eval-results.ts';
import { compareText } from './text.ts';

export interface GateOptions {
  minPassPct: number;
  maxErrorPct: number;
  minLoadPct: number;
}

export const GATE_DEFAULTS: GateOptions = { minPassPct: 70, maxErrorPct: 25, minLoadPct: 50 };

export interface GateReport {
  markdown: string;
  failed: boolean;
}

const RANK: Record<Verdict, number> = { worse: 0, error: 1, no_difference: 2, held: 3, improved: 4 };
const rank = (r: AbResult): number => RANK[r.verdict];

/** The numbers the gates and the summary are computed from. */
interface Stats {
  results: AbResult[];
  count: Record<Verdict, number>;
  graded: number;
  fullOn: number;
  passPct: number;
  errorPct: number;
  loadRuns: number;
  loadedRuns: number;
  /** -1 when no graded record reports skill loads. */
  loadPct: number;
  leaked: AbResult[];
}

function stats(results: AbResult[]): Stats {
  const count = { improved: 0, held: 0, no_difference: 0, worse: 0, error: 0 };
  for (const r of results) count[r.verdict]++;
  const graded = results.length - count.error;
  const fullOn = results.filter((r) => r.verdict !== 'error' && r.on === onDone(r)).length;
  // Skill loads over graded tasks whose adapter reported them.
  const reporting = results.filter((r) => r.verdict !== 'error' && isNumber(r.loaded_on));
  const loadRuns = reporting.reduce((n, r) => n + onDone(r), 0);
  const loadedRuns = reporting.reduce((n, r) => n + (r.loaded_on ?? 0), 0);
  return {
    results,
    count,
    graded,
    fullOn,
    passPct: graded > 0 ? pct(fullOn, graded) : 0,
    errorPct: pct(count.error, results.length),
    loadRuns,
    loadedRuns,
    loadPct: loadRuns > 0 ? pct(loadedRuns, loadRuns) : -1,
    leaked: results.filter((r) => isNumber(r.loaded_off) && r.loaded_off > 0),
  };
}

function summary(s: Stats, first: AbResult, opts: GateOptions): string[] {
  const out = [
    '## A/B eval results',
    '',
    `${first.agent ?? 'null'} / ${first.model ?? 'null'} @ ${first.sha ?? 'null'}, ${first.repeats} repeat(s)`,
    '',
    '| Verdict | Tasks |',
    '| ------- | ----- |',
    ...VERDICTS.map((v) => `| ${v} | ${s.count[v]} |`),
    '',
    `Skill-on full pass: **${s.fullOn} / ${s.graded}** (${s.passPct} %, gate ${opts.minPassPct} %).`,
  ];
  if (s.loadPct >= 0) {
    out.push(
      '',
      `Skill-on runs that loaded a task skill: **${s.loadedRuns} / ${s.loadRuns}** (${s.loadPct} %, gate ${opts.minLoadPct} %).`,
    );
  }
  return out;
}

function perTask(results: AbResult[]): string[] {
  const rows = results
    .toSorted((a, b) => rank(a) - rank(b) || compareText(a.task, b.task))
    .map((r) => {
      const loaded = isNumber(r.loaded_on) ? `${r.loaded_on}/${r.repeats}` : 'n/a';
      const tokens = hasTokens(r.tokens_on) ? `${r.tokens_on.input}/${r.tokens_on.output}` : 'n/a';
      return `| \`${r.task}\` | ${r.on}/${onDone(r)} | ${r.off}/${offDone(r)} | ${loaded} | ${tokens} | ${r.verdict} |`;
    });
  return [
    '',
    '<details><summary>Per task</summary>',
    '',
    'On and Off count passed / completed runs.',
    '',
    '| Task | On | Off | Skill loaded (on) | Tokens on (in/out) | Verdict |',
    '| ---- | -- | --- | ----------------- | ------------------ | ------- |',
    ...rows,
    '',
    '</details>',
    '',
  ];
}

const taskList = (results: AbResult[]): string[] => results.map((r) => `  - \`${r.task}\``);

/** One line per failed gate, each followed by the tasks it names. */
function failures(s: Stats, opts: GateOptions): string[] {
  const out: string[] = [];
  if (s.count.worse > 0) {
    out.push(
      `- **FAIL**: ${s.count.worse} task(s) got worse with the skill on:`,
      ...taskList(s.results.filter((r) => r.verdict === 'worse')),
    );
  }
  if (s.graded > 0 && s.passPct < opts.minPassPct) {
    out.push(`- **FAIL**: skill-on full pass rate ${s.passPct} % is below ${opts.minPassPct} %.`);
  }
  if (s.errorPct > opts.maxErrorPct) {
    out.push(
      `- **FAIL**: ${s.errorPct} % of tasks ended in agent errors (limit ${opts.maxErrorPct} %). Check the provider, then rerun.`,
    );
  }
  if (s.loadPct >= 0 && s.loadPct < opts.minLoadPct) {
    out.push(
      `- **FAIL**: only ${s.loadPct} % of skill-on runs loaded a task skill (gate ${opts.minLoadPct} %). The model ignores the skills, so on and off are the same run. Use a model that loads skills.`,
    );
  }
  if (s.leaked.length > 0) {
    out.push(
      `- **FAIL**: ${s.leaked.length} task(s) loaded a repo skill with skills off; the baseline is not skill-free:`,
      ...taskList(s.leaked),
    );
  }
  return out;
}

export function gate(all: AbResult[], opts: GateOptions = GATE_DEFAULTS): GateReport {
  const results = latestPerTask(all);
  const [first] = results;
  if (first === undefined) {
    return { markdown: ['## A/B eval results', '', 'No results found. Did any task run?'].join('\n'), failed: true };
  }
  const s = stats(results);
  const failed = failures(s, opts);
  const out = [...summary(s, first, opts), ...perTask(results), ...failed];
  const quiet = results.filter((r) => r.verdict === 'held' || r.verdict === 'no_difference');
  if (quiet.length > 0) {
    out.push(
      `- Warning: ${quiet.length} task(s) show no difference between skill on and off:`,
      ...quiet.map((r) => `  - \`${r.task}\` (${r.verdict}${r.loaded_on === 0 ? ', skill never loaded' : ''})`),
    );
  }
  if (failed.length === 0) out.push('- Gate: **PASS**');
  return { markdown: out.join('\n'), failed: failed.length > 0 };
}
