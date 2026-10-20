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
import { type AbResult, compareText, hasTokens, isNumber, latestPerTask, offDone, onDone, pct } from './eval-results.ts';

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

const RANK: Record<string, number> = { worse: 0, error: 1, no_difference: 2, held: 3, improved: 4 };
const rank = (r: AbResult): number => RANK[r.verdict] ?? 5;

export function gate(all: AbResult[], opts: GateOptions = GATE_DEFAULTS): GateReport {
  const results = latestPerTask(all);
  const out: string[] = [];
  const total = results.length;
  if (total === 0) {
    out.push('## A/B eval results', '', 'No results found. Did any task run?');
    return { markdown: out.join('\n'), failed: true };
  }

  const count = (v: string): number => results.filter((r) => r.verdict === v).length;
  const improved = count('improved');
  const held = count('held');
  const nodiff = count('no_difference');
  const worse = count('worse');
  const errors = count('error');
  const graded = total - errors;
  const fullOn = results.filter((r) => r.verdict !== 'error' && r.on === onDone(r)).length;
  const passPct = graded > 0 ? pct(fullOn, graded) : 0;
  const errorPct = pct(errors, total);

  // Skill loads over graded tasks whose adapter reported them.
  const reporting = results.filter((r) => r.verdict !== 'error' && isNumber(r.loaded_on));
  const loadRuns = reporting.reduce((n, r) => n + onDone(r), 0);
  const loadedRuns = reporting.reduce((n, r) => n + (r.loaded_on as number), 0);
  const leaked = results.filter((r) => isNumber(r.loaded_off) && r.loaded_off > 0);
  const loadPct = loadRuns > 0 ? pct(loadedRuns, loadRuns) : -1;

  const first = results[0]!;
  out.push('## A/B eval results', '', `${first.agent ?? 'null'} / ${first.model ?? 'null'} @ ${first.sha ?? 'null'}, ${first.repeats} repeat(s)`, '');
  out.push('| Verdict | Tasks |', '| ------- | ----- |');
  out.push(`| improved | ${improved} |`, `| held | ${held} |`, `| no_difference | ${nodiff} |`);
  out.push(`| worse | ${worse} |`, `| error | ${errors} |`, '');
  out.push(`Skill-on full pass: **${fullOn} / ${graded}** (${passPct} %, gate ${opts.minPassPct} %).`);
  if (loadPct >= 0) {
    out.push('', `Skill-on runs that loaded a task skill: **${loadedRuns} / ${loadRuns}** (${loadPct} %, gate ${opts.minLoadPct} %).`);
  }
  out.push('', '<details><summary>Per task</summary>', '', 'On and Off count passed / completed runs.', '');
  out.push('| Task | On | Off | Skill loaded (on) | Tokens on (in/out) | Verdict |');
  out.push('| ---- | -- | --- | ----------------- | ------------------ | ------- |');
  const rows = [...results].sort((a, b) => rank(a) - rank(b) || compareText(a.task, b.task));
  for (const r of rows) {
    const loaded = isNumber(r.loaded_on) ? `${r.loaded_on}/${r.repeats}` : 'n/a';
    const tokens = hasTokens(r.tokens_on) ? `${r.tokens_on.input}/${r.tokens_on.output}` : 'n/a';
    out.push(`| \`${r.task}\` | ${r.on}/${onDone(r)} | ${r.off}/${offDone(r)} | ${loaded} | ${tokens} | ${r.verdict} |`);
  }
  out.push('', '</details>', '');

  let failed = false;
  if (worse > 0) {
    out.push(`- **FAIL**: ${worse} task(s) got worse with the skill on:`);
    for (const r of results.filter((x) => x.verdict === 'worse')) out.push(`  - \`${r.task}\``);
    failed = true;
  }
  if (graded > 0 && passPct < opts.minPassPct) {
    out.push(`- **FAIL**: skill-on full pass rate ${passPct} % is below ${opts.minPassPct} %.`);
    failed = true;
  }
  if (errorPct > opts.maxErrorPct) {
    out.push(`- **FAIL**: ${errorPct} % of tasks ended in agent errors (limit ${opts.maxErrorPct} %). Check the provider, then rerun.`);
    failed = true;
  }
  if (loadPct >= 0 && loadPct < opts.minLoadPct) {
    out.push(
      `- **FAIL**: only ${loadPct} % of skill-on runs loaded a task skill (gate ${opts.minLoadPct} %). The model ignores the skills, so on and off are the same run. Use a model that loads skills.`,
    );
    failed = true;
  }
  if (leaked.length > 0) {
    out.push(`- **FAIL**: ${leaked.length} task(s) loaded a repo skill with skills off; the baseline is not skill-free:`);
    for (const r of leaked) out.push(`  - \`${r.task}\``);
    failed = true;
  }
  const quiet = results.filter((r) => r.verdict === 'held' || r.verdict === 'no_difference');
  if (quiet.length > 0) {
    out.push(`- Warning: ${quiet.length} task(s) show no difference between skill on and off:`);
    for (const r of quiet) out.push(`  - \`${r.task}\` (${r.verdict}${r.loaded_on === 0 ? ', skill never loaded' : ''})`);
  }
  if (!failed) out.push('- Gate: **PASS**');
  return { markdown: out.join('\n'), failed };
}
