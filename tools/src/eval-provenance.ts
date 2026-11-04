import { createHash, randomUUID } from 'node:crypto';
import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { filesUnder } from './grade/kit.ts';
import { profileSkills } from './skills-profile.ts';
import { envOr } from './env.ts';
import { agentLabel, modelLabel } from './agent-config.ts';
import { shortSha } from './revision.ts';
export { shortSha } from './revision.ts';

/** Hash paths as well as bytes, so moves and deletions change the snapshot. */
export function contentHash(root: string, files: string[]): string {
  const hash = createHash('sha256');
  for (const file of [...new Set(files)].toSorted()) {
    hash.update(relative(root, file));
    hash.update('\0');
    hash.update(readFileSync(file));
    hash.update('\0');
  }
  return hash.digest('hex');
}

const tree = (root: string, path: string): string[] =>
  existsSync(join(root, path)) ? filesUnder(join(root, path)) : [];

export function provenance(
  root: string,
  task: string,
  skillsDir = join(root, 'skills'),
): { task_hash: string; skills_hash: string; grader_hash: string } {
  const skills = profileSkills(root, task, skillsDir).flatMap((name) => tree(skillsDir, name));
  return {
    task_hash: contentHash(root, tree(root, `evals/tasks/${task}`)),
    skills_hash: contentHash(skillsDir, skills),
    grader_hash: contentHash(root, [
      ...tree(root, 'tools/src'),
      ...tree(root, 'tools/graders'),
      ...tree(root, 'evals/tools/ast/src'),
      ...tree(root, 'tools/bin'),
    ]),
  };
}

export function startEvidence(
  root: string,
  task: string,
  base: string,
  env: NodeJS.ProcessEnv,
): { runId: string; artifacts: string; snapshot: ReturnType<typeof provenance> } {
  const runId = randomUUID();
  const artifacts = join(base, `${task}-${runId}`);
  mkdirSync(artifacts, { recursive: true });
  const snapshot = provenance(root, task, envOr(env, 'EVAL_SKILLS_ROOT', join(root, 'skills')));
  writeFileSync(
    join(artifacts, 'snapshot.json'),
    `${JSON.stringify(
      {
        ...snapshot,
        task,
        run_id: runId,
        experiment_id: envOr(env, 'EVAL_EXPERIMENT_ID', ''),
        agent: agentLabel(env),
        model: modelLabel(env),
        sha: shortSha(root),
      },
      null,
      2,
    )}\n`,
  );
  return { runId, artifacts, snapshot };
}
