// A/B ablation for one task. evals/runner/ab.sh is a wrapper for this file;
// its header documents the environment, verdicts and exit codes.
//
//   node tools/bin/ab.ts <task-name> [repeats]
import { appendFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { abRecord, abSummary, agentLabel, decide, runModes, shortSha } from '../src/ab.ts';
import { stderr } from '../src/cli.ts';
import { envInt, envOr, envSet } from '../src/env.ts';
import { errorMessage } from '../src/errors.ts';

const root = resolve(import.meta.dirname, '../..');
const env = process.env;

/** The reason the A/B cannot start, with its exit code, or null. */
function refusal(task: string): [string, number] | null {
  const taskDir = join(root, 'evals/tasks', task);
  if (task.includes('/') || !existsSync(taskDir) || !statSync(taskDir).isDirectory()) {
    return [`Unknown task: ${task}`, 2];
  }
  if (!envSet(env, 'SKILLS_AGENT_CMD')) return ['SKILLS_AGENT_CMD not set -> cannot run the A/B.', 3];
  if (!['SKILLS_PROFILE_CMD', 'SKILLS_PROFILE_ON_CMD', 'SKILLS_PROFILE_OFF_CMD'].some((n) => envSet(env, n))) {
    return [
      `No SKILLS_PROFILE_CMD: 'on' and 'off' would load the same skills. Refusing.\nUse: SKILLS_PROFILE_CMD=${join(root, 'evals/runner/skills-profile.sh')}`,
      2,
    ];
  }
  return null;
}

async function main(): Promise<number> {
  const [task, repeatsArg = '1', ...rest] = process.argv.slice(2);
  if (task === undefined || task === '' || rest.length > 0) {
    console.error('usage: ab.sh <task-name> [repeats]');
    return 2;
  }
  if (!/^[1-9][0-9]*$/u.test(repeatsArg)) {
    console.error('repeats must be a positive integer');
    return 2;
  }
  const refused = refusal(task);
  if (refused !== null) {
    console.error(refused[0]);
    return refused[1];
  }
  let minDelta: number;
  try {
    minDelta = envInt(env, 'EVAL_AB_MIN_DELTA_PCT', 50);
  } catch (error) {
    console.error(`ab: ${errorMessage(error)}`);
    return 2;
  }

  const repeats = Number(repeatsArg);
  const results = envOr(env, 'EVAL_RESULTS', join(root, 'evals/.results/ab.jsonl'));
  mkdirSync(dirname(results), { recursive: true });

  const { on, off } = await runModes({ root, task, repeats, env, err: stderr });
  const decision = decide(repeats, on, off, minDelta);
  const record = abRecord(task, repeats, on, off, decision, {
    agent: agentLabel(env),
    model: envOr(env, 'TASK_MODEL', 'default'),
    sha: shortSha(root),
    ts: new Date().toISOString().replace(/\.\d{3}Z$/u, 'Z'),
  });
  appendFileSync(results, `${JSON.stringify(record)}\n`);
  console.log(abSummary(record, on, off));
  return decision.code;
}

process.exitCode = await main();
