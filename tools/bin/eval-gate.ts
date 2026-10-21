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
import { envInt } from '../src/env.ts';
import { errorMessage } from '../src/errors.ts';
import { GATE_DEFAULTS, gate } from '../src/eval-gate.ts';
import { parseResults } from '../src/eval-results.ts';

function main(): number {
  const files = process.argv.slice(2);
  if (files.length === 0) {
    console.error('usage: eval-gate.ts <ab.jsonl> [...]');
    return 2;
  }
  try {
    const results = files.flatMap((f) => parseResults(readFileSync(f, 'utf8')));
    const report = gate(results, {
      minPassPct: envInt(process.env, 'EVAL_GATE_MIN_PASS_PCT', GATE_DEFAULTS.minPassPct),
      maxErrorPct: envInt(process.env, 'EVAL_GATE_MAX_ERROR_PCT', GATE_DEFAULTS.maxErrorPct),
      minLoadPct: envInt(process.env, 'EVAL_GATE_MIN_LOAD_PCT', GATE_DEFAULTS.minLoadPct),
    });
    console.log(report.markdown);
    return report.failed ? 1 : 0;
  } catch (error) {
    console.error(`eval-gate: ${errorMessage(error)}`);
    return 2;
  }
}

process.exitCode = main();
