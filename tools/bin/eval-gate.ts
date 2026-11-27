// Gate and summarize A/B results written by evals/runner/ab.sh.
// scripts/eval-gate.sh is a wrapper for this file.
//
//   node tools/bin/eval-gate.ts <ab.jsonl> [more.jsonl ...]
//   node tools/bin/eval-gate.ts --provider <ab.jsonl> [...]
//
// Prints a Markdown summary (append it to $GITHUB_STEP_SUMMARY in CI) and
// exits 1 when a gate fails, 2 on a usage error or an unreadable file.
// The gates are described in tools/src/eval-gate.ts.
//
// --provider checks only whether the run says anything about the skills: it
// exits 1 with the reason when there are no results or more agent errors
// than EVAL_GATE_MAX_ERROR_PCT allows (a quota that ran out, a provider
// outage). The baseline job uses it so such a run never becomes a baseline.
//
// Env: EVAL_GATE_MIN_PASS_PCT (default 70), EVAL_GATE_MAX_ERROR_PCT
// (default 25), EVAL_GATE_MIN_LOAD_PCT (default 50).
import { existsSync, readFileSync } from 'node:fs';
import { errorMessage } from '../src/errors.ts';
import { gate, gateOptionsFromEnv, providerFailure } from '../src/eval-gate.ts';
import { parseResults } from '../src/eval-results.ts';
import { parseManifest } from '../src/eval-manifest.ts';
import { envOr, envSet } from '../src/env.ts';

function main(): number {
  const args = process.argv.slice(2);
  const providerOnly = args[0] === '--provider';
  const files = providerOnly ? args.slice(1) : args;
  if (files.length === 0) {
    console.error('usage: eval-gate.ts [--provider] <ab.jsonl> [...]');
    return 2;
  }
  try {
    const results = files.flatMap((f) => parseResults(readFileSync(f, 'utf8')));
    if (providerOnly) {
      const reason = providerFailure(results, gateOptionsFromEnv(process.env));
      if (reason === null) return 0;
      console.log(reason);
      return 1;
    }
    const path = envOr(process.env, 'EVAL_MANIFEST', `${files[0] ?? ''}.manifest.json`);
    const expected = existsSync(path) ? parseManifest(readFileSync(path, 'utf8')) : undefined;
    if (envSet(process.env, 'EVAL_MANIFEST') && expected === undefined) throw new Error(`manifest not found: ${path}`);
    const report = gate(results, gateOptionsFromEnv(process.env), expected);
    console.log(report.markdown);
    return report.failed ? 1 : 0;
  } catch (error) {
    console.error(`eval-gate: ${errorMessage(error)}`);
    return 2;
  }
}

process.exitCode = main();
