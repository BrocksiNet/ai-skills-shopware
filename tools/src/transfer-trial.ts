import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { jsonLines, parseClaude } from './agent-events.ts';
import { sumUsage } from './ab.ts';
import type { DiscoveryVariant } from './discovery-pilot.ts';
import { envOr } from './env.ts';
import { referenceReads, type ReferenceRead } from './reference-reads.ts';
import { RUN, runTask, type RunTaskOptions } from './run-task.ts';
import type { TransferCase } from './transfer-plan.ts';

export interface TransferJob {
  task: string;
  variant: DiscoveryVariant;
  repeat: number;
}
export interface TransferTrial extends TransferJob {
  status: 'pass' | 'fail' | 'error' | 'skipped';
  exit_code: number;
  duration_ms: number;
  retrieval_observable: boolean;
  reference_reads: ReferenceRead[];
  required_references_read: string[];
  other_references_read: string[];
  loaded_skills: string[];
  reported_models: string[];
  tokens: [number, number] | null;
  artifacts: string;
  termination?: string[];
  cost_usd?: number;
}
export interface TransferRun {
  root: string;
  destination: string;
  packages: string;
  env: NodeJS.ProcessEnv;
  run?: (o: RunTaskOptions) => Promise<number>;
}

const read = (file: string): string => (existsSync(file) ? readFileSync(file, 'utf8') : '');

function observations(
  dir: string,
  references: Map<string, string>,
  spec: TransferCase,
): Pick<
  TransferTrial,
  | 'retrieval_observable'
  | 'reference_reads'
  | 'required_references_read'
  | 'other_references_read'
  | 'loaded_skills'
  | 'reported_models'
  | 'tokens'
  | 'termination'
  | 'cost_usd'
> {
  const trace = read(join(dir, 'trace.jsonl'));
  const evidence = referenceReads(trace, references);
  const seen = [...new Set(evidence.reads.map((r) => r.reference))].toSorted();
  const models = jsonLines(trace).flatMap((e) =>
    typeof e.modelUsage === 'object' && e.modelUsage !== null ? Object.keys(e.modelUsage) : [],
  );
  const usage = read(join(dir, 'usage.txt'));
  return {
    retrieval_observable: evidence.observable,
    termination: jsonLines(trace).flatMap((e) =>
      e.type === 'result' && typeof e.subtype === 'string' ? [e.subtype] : [],
    ),
    cost_usd: jsonLines(trace).reduce(
      (n, e) => n + (e.type === 'result' && typeof e.total_cost_usd === 'number' ? e.total_cost_usd : 0),
      0,
    ),
    reference_reads: evidence.reads,
    required_references_read: seen.filter((r) => spec.expected_references.includes(r)),
    other_references_read: seen.filter((r) => !spec.expected_references.includes(r)),
    loaded_skills: parseClaude(trace).skills,
    reported_models: [...new Set(models)],
    tokens: usage.trim() === '' ? null : sumUsage(usage),
  };
}

export async function transferTrial(
  o: TransferRun,
  job: TransferJob,
  spec: TransferCase,
  references: Map<string, string>,
  skip: number | null,
): Promise<TransferTrial> {
  const dir = join(o.destination, 'trials', `${job.task}-${job.variant}-${job.repeat}`);
  mkdirSync(dir, { recursive: true });
  let stdout = '';
  let stderr = '';
  const started = Date.now();
  const rc =
    skip ??
    (await (o.run ?? runTask)({
      root: o.root,
      task: job.task,
      mode: 'on',
      artifacts: dir,
      env: {
        ...o.env,
        EVAL_SKILLS_ROOT: join(o.packages, job.variant, 'skills'),
        EVAL_AGENT_RETRIES: '0',
        EVAL_AGENT_TIMEOUT_SECONDS: envOr(o.env, 'EVAL_AGENT_TIMEOUT_SECONDS', '180'),
        EVAL_TRACE_LOG: join(dir, 'trace.jsonl'),
        EVAL_SKILLS_LOG: join(dir, 'skills.txt'),
        EVAL_USAGE_LOG: join(dir, 'usage.txt'),
        TASK_TOOLS: 'Skill,Read,Edit,Write,Glob,Grep,Bash',
      },
      out: (s) => {
        stdout += s;
      },
      err: (s) => {
        stderr += s;
      },
    }));
  writeFileSync(join(dir, 'stdout.txt'), stdout);
  writeFileSync(join(dir, 'stderr.txt'), stderr);
  return {
    ...job,
    exit_code: rc,
    duration_ms: Date.now() - started,
    status: skip === null ? (rc === RUN.pass ? 'pass' : rc === RUN.fail ? 'fail' : 'error') : 'skipped',
    ...observations(dir, references, spec),
    artifacts: relative(o.destination, dir),
  };
}
