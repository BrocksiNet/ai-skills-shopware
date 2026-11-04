import { appendFileSync, cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { DISCOVERY_VARIANTS, prepareDiscovery } from './discovery-pilot.ts';
import { contentHash, provenance } from './eval-provenance.ts';
import { filesUnder } from './grade/kit.ts';
import { inSeries } from './series.ts';
import { transferCases } from './transfer-plan.ts';
import { transferTrial, type TransferJob, type TransferRun, type TransferTrial } from './transfer-trial.ts';
import { envOr } from './env.ts';

export interface TransferOptions extends Omit<TransferRun, 'packages'> {
  repeats: number;
  plan?: string;
  log: (text: string) => void;
  random?: () => number;
}

function schedule(tasks: string[], repeats: number, random: () => number): TransferJob[] {
  return tasks.flatMap((task) =>
    Array.from({ length: repeats }, (_, i) => {
      const variants = [...DISCOVERY_VARIANTS];
      for (let j = variants.length - 1; j > 0; j--) {
        const k = Math.floor(random() * (j + 1));
        const a = variants[j];
        const b = variants[k];
        if (a !== undefined && b !== undefined) {
          variants[j] = b;
          variants[k] = a;
        }
      }
      return variants.map((variant) => ({ task, variant, repeat: i + 1 }));
    }).flat(),
  );
}

/** Freeze every input before evaluating; no skill changes are made from these results. */
export function freezeTransfer(o: TransferOptions): TransferJob[] {
  if (!Number.isSafeInteger(o.repeats) || o.repeats < 1) throw new Error('repeats must be positive');
  const cases = transferCases(o.root, o.plan);
  prepareDiscovery(o.root, o.destination);
  const jobs = schedule(
    cases.map((c) => c.task),
    o.repeats,
    o.random ?? Math.random,
  );
  const variants = DISCOVERY_VARIANTS.map((variant) => {
    const root = join(o.destination, variant);
    return { variant, skills_hash: contentHash(root, filesUnder(join(root, 'skills'))) };
  });
  const inputs = cases.map((c) => Object.assign({}, c, provenance(o.root, c.task)));
  writeFileSync(
    join(o.destination, 'manifest.json'),
    `${JSON.stringify(
      {
        version: 1,
        purpose: 'Frozen transfer comparison; protocol defines holdout status. No equivalence or retirement claim.',
        created_at: new Date().toISOString(),
        plan: o.plan ?? 'evals/experiments/discovery-transfer-v1.json',
        agent: envOr(o.env, 'EVAL_AGENT', 'unknown'),
        model: envOr(o.env, 'TASK_MODEL', 'default'),
        limits: {
          max_turns: envOr(o.env, 'TASK_MAX_TURNS', '12'),
          max_budget_usd: envOr(o.env, 'TASK_MAX_BUDGET_USD', '0.75'),
          timeout_seconds: envOr(o.env, 'EVAL_AGENT_TIMEOUT_SECONDS', '180'),
          retries: 0,
          tools: 'Skill,Read,Edit,Write,Glob,Grep,Bash',
        },
        repeats: o.repeats,
        cases: inputs,
        variants,
        schedule: jobs,
        retrieval:
          'Successful Read or literal shell read with matching source content; shell excerpts are marked. No citations, listings or failed calls.',
        outcome: 'Use each case outcome_kind for its execution/structural scope; no full Shopware runtime.',
      },
      null,
      2,
    )}\n`,
  );
  return jobs;
}

/** Execute a schedule prepared before any profiles start. Caller verifies frozen inputs. */
export async function runFrozenTransfer(
  o: TransferOptions,
  jobs: TransferJob[],
): Promise<{ code: number; trials: TransferTrial[] }> {
  const isolated = mkdtempSync(join(tmpdir(), 'transfer-packages-'));
  const packages = join(isolated, 'packages');
  mkdirSync(packages);
  for (const variant of DISCOVERY_VARIANTS)
    cpSync(join(o.destination, variant), join(packages, variant), { recursive: true });
  const packageHash = contentHash(packages, filesUnder(packages));
  const cases = new Map(transferCases(o.root, o.plan).map((c) => [c.task, c]));
  const refs = new Map(
    filesUnder(join(packages, 'current/skills'))
      .filter((f) => f.includes('/references/') && f.endsWith('.md'))
      .map((f) => [relative(join(packages, 'current/skills'), f), readFileSync(f, 'utf8')]),
  );
  const trials: TransferTrial[] = [];
  let skip: number | null = null;
  try {
    await inSeries(jobs, async (job) => {
      const spec = cases.get(job.task);
      if (spec === undefined) throw new Error('task missing from frozen plan');
      const trial = await transferTrial({ ...o, packages }, job, spec, refs, skip);
      trials.push(trial);
      appendFileSync(join(o.destination, 'trials.jsonl'), `${JSON.stringify(trial)}\n`);
      if (contentHash(packages, filesUnder(packages)) !== packageHash)
        throw new Error('installed skill packages changed during the trial; invalidate continuation');
      o.log(
        `${job.task} / ${job.variant} / ${job.repeat}: ${trial.status.toUpperCase()} / references ${trial.required_references_read.length}/${spec.expected_references.length}\n`,
      );
      if (trial.status === 'error') skip = trial.exit_code;
    });
  } finally {
    rmSync(isolated, { recursive: true, force: true });
  }
  return { code: trials.some((t) => t.status === 'error' || t.status === 'skipped') ? 2 : 0, trials };
}

export function runTransfer(o: TransferOptions): Promise<{ code: number; trials: TransferTrial[] }> {
  return runFrozenTransfer(o, freezeTransfer(o));
}
