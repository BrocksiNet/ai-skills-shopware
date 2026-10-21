// Pick the eval tasks for a model run and split them into shards.
// scripts/eval-plan.sh is a wrapper for this file.
//
//   node tools/bin/eval-plan.ts
//
// Env:
//   EVAL_TASKS          comma-separated task names; empty = all tasks
//   EVAL_CHANGED_FILES  path to a file with one changed repo path per line
//                       (PR mode). Ignored when EVAL_TASKS is set.
//   EVAL_MAX_TASKS      cap after selection; 0 = no cap (default 0)
//   EVAL_SHARDS         number of shards (default 4)
//
// Prints one JSON object:
//   {"tasks":["a","b"],"count":2,"shards":[{"id":1,"tasks":"a"},{"id":2,"tasks":"b"}]}
// Exit 2 on a bad setting or an unknown task.
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { envInt, envOr } from '../src/env.ts';
import { errorMessage } from '../src/errors.ts';
import { type PlanOptions, plan } from '../src/eval-plan.ts';

const root = resolve(import.meta.dirname, '../..');

function main(env: NodeJS.ProcessEnv): number {
  try {
    const opts: PlanOptions = {
      maxTasks: envInt(env, 'EVAL_MAX_TASKS', 0),
      shards: envInt(env, 'EVAL_SHARDS', 4, 1),
    };
    const tasks = envOr(env, 'EVAL_TASKS', '');
    const changed = envOr(env, 'EVAL_CHANGED_FILES', '');
    if (tasks !== '') {
      opts.tasks = tasks.split(',');
    } else if (changed !== '') {
      opts.changedFiles = existsSync(changed)
        ? readFileSync(changed, 'utf8')
            .split('\n')
            .filter((l) => l !== '')
        : [];
    }
    console.log(JSON.stringify(plan(resolve(root, 'evals/tasks'), opts)));
    return 0;
  } catch (error) {
    console.error(`eval-plan: ${errorMessage(error)}`);
    return 2;
  }
}

process.exitCode = main(process.env);
