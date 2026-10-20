// Gate and summarize A/B results written by evals/runner/ab.sh.
// scripts/eval-gate.sh is a wrapper for this file.
//
//   node tools/bin/eval-gate.ts <ab.jsonl> [more.jsonl ...]
//
// Prints a Markdown summary (append it to $GITHUB_STEP_SUMMARY in CI) and
// exits 1 when a gate fails, 2 on a usage error or an unreadable file.
// The gates are described in tools/src/eval-gate.ts.
//
// Env: EVAL_GATE_MIN_PASS_PCT (default 70), EVAL_GATE_MAX_ERROR_PCT
// (default 25), EVAL_GATE_MIN_LOAD_PCT (default 50).
import { readFileSync } from 'node:fs';
import { GATE_DEFAULTS, type GateOptions, gate } from '../src/eval-gate.ts';
import { type AbResult, envInt, parseResults } from '../src/eval-results.ts';

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error('usage: eval-gate.ts <ab.jsonl> [...]');
  process.exit(2);
}
let results: AbResult[];
let opts: GateOptions;
try {
  results = files.flatMap((f) => parseResults(readFileSync(f, 'utf8')));
  opts = {
    minPassPct: envInt(process.env, 'EVAL_GATE_MIN_PASS_PCT', GATE_DEFAULTS.minPassPct),
    maxErrorPct: envInt(process.env, 'EVAL_GATE_MAX_ERROR_PCT', GATE_DEFAULTS.maxErrorPct),
    minLoadPct: envInt(process.env, 'EVAL_GATE_MIN_LOAD_PCT', GATE_DEFAULTS.minLoadPct),
  };
} catch (e) {
  console.error(`eval-gate: ${(e as Error).message}`);
  process.exit(2);
}
const report = gate(results, opts);
console.log(report.markdown);
process.exit(report.failed ? 1 : 0);
