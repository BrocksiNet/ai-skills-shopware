// Creating an experiment performs I/O; parsing and validating evidence do not.
import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { envOr } from './env.ts';
import { modelLabel } from './agent-config.ts';
import { parseManifest, type EvalManifest } from './eval-manifest.ts';
import { shortSha } from './revision.ts';
export type { EvalManifest } from './eval-manifest.ts';

export function manifest(tasks: string[], repeats: number, env: NodeJS.ProcessEnv, sha: string): EvalManifest {
  const result: EvalManifest = {
    version: 1,
    id: envOr(env, 'EVAL_EXPERIMENT_ID', randomUUID()),
    tasks,
    repeats,
    agent: envOr(env, 'EVAL_AGENT', 'unknown'),
    model: modelLabel(env),
    sha,
  };
  return parseManifest(JSON.stringify(result));
}

export function freezeManifest(
  root: string,
  results: string,
  tasks: string[],
  repeats: number,
  env: NodeJS.ProcessEnv,
): EvalManifest {
  if (existsSync(results) || existsSync(`${results}.manifest.json`)) {
    throw new Error(`results already exist: ${results}; choose a new EVAL_RESULTS path`);
  }
  const expected = manifest(tasks, repeats, env, shortSha(root));
  mkdirSync(dirname(results), { recursive: true });
  writeFileSync(`${results}.manifest.json`, `${JSON.stringify(expected, null, 2)}\n`, { flag: 'wx' });
  return expected;
}
