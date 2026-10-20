// A/B ablation for one task. evals/runner/ab.sh is a wrapper for this file;
// its header documents the environment, verdicts and exit codes.
//
//   node tools/bin/ab.ts <task-name> [repeats]
import { appendFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { abRecord, abSummary, agentLabel, decide, runModes, shortSha } from '../src/ab.ts';
import { envInt } from '../src/eval-results.ts';

const root = resolve(import.meta.dirname, '../..');
const env = process.env;
const fail = (message: string, code: number): never => {
  console.error(message);
  process.exit(code);
};

const [task, repeatsArg = '1', ...rest] = process.argv.slice(2);
if (task === undefined || task === '' || rest.length > 0) fail('usage: ab.sh <task-name> [repeats]', 2);
if (!/^[1-9][0-9]*$/.test(repeatsArg)) fail('repeats must be a positive integer', 2);
const taskDir = join(root, 'evals/tasks', task!);
if (task!.includes('/') || !existsSync(taskDir) || !statSync(taskDir).isDirectory()) fail(`Unknown task: ${task}`, 2);
if (!env.SKILLS_AGENT_CMD) fail('SKILLS_AGENT_CMD not set -> cannot run the A/B.', 3);
if (!env.SKILLS_PROFILE_CMD && !env.SKILLS_PROFILE_ON_CMD && !env.SKILLS_PROFILE_OFF_CMD) {
  fail(`No SKILLS_PROFILE_CMD: 'on' and 'off' would load the same skills. Refusing.\nUse: SKILLS_PROFILE_CMD=${join(root, 'evals/runner/skills-profile.sh')}`, 2);
}
let minDelta = 50;
try {
  minDelta = envInt(env, 'EVAL_AB_MIN_DELTA_PCT', 50);
} catch (e) {
  fail(`ab: ${(e as Error).message}`, 2);
}

const repeats = Number(repeatsArg);
const results = env.EVAL_RESULTS || join(root, 'evals/.results/ab.jsonl');
mkdirSync(dirname(results), { recursive: true });

const { on, off } = await runModes({ root, task: task!, repeats, env, err: (t) => process.stderr.write(t) });
const decision = decide(repeats, on, off, minDelta);
const record = abRecord(task!, repeats, on, off, decision, {
  agent: agentLabel(env),
  model: env.TASK_MODEL || 'default',
  sha: shortSha(root),
  ts: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
});
appendFileSync(results, `${JSON.stringify(record)}\n`);
console.log(abSummary(record, on, off));
process.exitCode = decision.code;
