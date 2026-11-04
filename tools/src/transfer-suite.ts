import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { contentHash } from './eval-provenance.ts';
import { freezeTransfer, runFrozenTransfer, type TransferOptions } from './transfer-eval.ts';
import { freezeInputs } from './transfer-freeze.ts';
import { filesUnder } from './grade/kit.ts';
import { transferCases } from './transfer-plan.ts';
import { summarizeTransfer } from './transfer-summary.ts';
import { inSeries } from './series.ts';
import type { TransferJob } from './transfer-trial.ts';

export interface PreparedTransferSuite {
  profiles: { options: TransferOptions; jobs: TransferJob[] }[];
  verify: () => void;
}

export const FACT_PLAN = 'evals/experiments/facts-transfer-v2.json';
function settings(root: string, plan: string): { models: string[]; repeats: number } {
  const raw: unknown = JSON.parse(readFileSync(join(root, plan), 'utf8'));
  if (
    typeof raw !== 'object' ||
    raw === null ||
    !('models' in raw) ||
    !Array.isArray(raw.models) ||
    !('repeats' in raw) ||
    typeof raw.repeats !== 'number' ||
    !Number.isSafeInteger(raw.repeats) ||
    raw.repeats < 1
  )
    throw new Error('invalid transfer suite settings');
  const models = raw.models.filter(
    (m: unknown): m is string => typeof m === 'string' && /^[a-z0-9][a-z0-9.-]*$/u.test(m),
  );
  if (models.length !== raw.models.length || new Set(models).size !== models.length || models.length === 0)
    throw new Error('invalid transfer suite models');
  return { models, repeats: raw.repeats };
}
function inputPaths(root: string, plan: string): string[] {
  return [
    plan,
    'tools/src',
    'tools/bin',
    'tools/graders',
    'evals/tools/ast/src',
    'evals/runner',
    'skills',
    'evals/experiments',
    'tools/package.json',
    'tools/package-lock.json',
    'evals/tools/ast/package.json',
    'evals/tools/ast/package-lock.json',
    ...transferCases(root, plan).map((c) => `evals/tasks/${c.task}`),
  ];
}
export function prepareTransferSuite(o: TransferOptions): PreparedTransferSuite {
  const plan = o.plan ?? FACT_PLAN;
  const spec = settings(o.root, plan);
  mkdirSync(o.destination);
  const profiles = spec.models.map((model) => {
    const options = {
      ...o,
      plan,
      repeats: spec.repeats,
      destination: join(o.destination, model),
      env: { ...o.env, TASK_MODEL: model },
    };
    return { options, jobs: freezeTransfer(options) };
  });
  const verifySource = freezeInputs(o.root, o.destination, inputPaths(o.root, plan));
  const packages = profiles.map((p) => ({
    root: p.options.destination,
    hash: contentHash(p.options.destination, filesUnder(p.options.destination)),
  }));
  const verify = (): void => {
    verifySource();
    for (const p of packages) {
      const files = filesUnder(p.root).filter(
        (f) => !f.includes('/trials/') && !f.endsWith('/trials.jsonl') && !f.endsWith('/summary.json'),
      );
      if (contentHash(p.root, files) !== p.hash) throw new Error('frozen skill packages or schedule changed');
    }
  };
  writeFileSync(
    join(o.destination, 'suite.json'),
    `${JSON.stringify(
      {
        plan,
        ...spec,
        profiles: profiles.map((p) => ({ model: p.options.env.TASK_MODEL, trials: p.jobs.length })),
        package_hashes: packages,
      },
      null,
      2,
    )}\n`,
  );
  return { profiles, verify };
}
export async function runTransferSuite(o: TransferOptions, prepared = prepareTransferSuite(o)): Promise<number> {
  let code = 0;
  await inSeries(prepared.profiles, async (p) => {
    prepared.verify();
    const result = await runFrozenTransfer(p.options, p.jobs);
    prepared.verify();
    const summary = summarizeTransfer(transferCases(o.root, p.options.plan), result.trials);
    writeFileSync(join(p.options.destination, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
    code = Math.max(code, result.code);
  });
  return code;
}
