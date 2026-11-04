// An isolated packaging experiment. Published skills are never rewritten.
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
  appendFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { envOr } from './env.ts';
import { contentHash, provenance } from './eval-provenance.ts';
import { filesUnder } from './grade/kit.ts';
import { buildIndex, renderIndex } from './router-index.ts';
import { applyTable, loadRoutes } from './routes.ts';
import { RUN, runTask, type RunTaskOptions } from './run-task.ts';
import { inSeries } from './series.ts';

export const DISCOVERY_VARIANTS = ['current', 'merged', 'removed'] as const;
export const DISCOVERY_TASKS = ['discovery-overview', 'discovery-plugin-review', 'discovery-app-plan'];
export type DiscoveryVariant = (typeof DISCOVERY_VARIANTS)[number];

function mergeDiscovery(root: string, packageRoot: string): void {
  const skills = join(packageRoot, 'skills');
  const router = join(skills, 'sw-skill-router');
  mkdirSync(join(router, 'references'));
  const help = readFileSync(join(root, 'skills/sw-help/SKILL.md'), 'utf8')
    .replace(/^---\n[\s\S]*?\n---\n/u, '')
    .replaceAll(' --skill sw-help', '')
    .replaceAll('`sw-help`', '`sw-skill-router`')
    .replaceAll('/sw-help', '/sw-skill-router');
  writeFileSync(join(router, 'references/library-guide.md'), help);
  const routes = {
    routes: [
      {
        reference: 'references/library-guide.md',
        when: 'Explain the library, show use cases or help a new user get started.',
        on_demand: true,
      },
    ],
  };
  writeFileSync(join(router, 'routes.json'), `${JSON.stringify(routes, null, 2)}\n`);
  const original = readFileSync(join(router, 'SKILL.md'), 'utf8');
  const candidate = original
    .replace(
      /description: >-\n[\s\S]*?\nlicense:/u,
      'description: >-\n  Find the Shopware skills and references a diff or plan needs, or explain\n  what this library offers and how to start. Use for routing a change,\n  choosing skills, installation guidance, or an overview of the library.\n  For Shopware implementation questions, select the owning topic skill.\nlicense:',
    )
    .replace(
      '# Skill router\n',
      '# Shopware skills: discover and route\n\n' +
        'For an overview, use cases, example prompts or installation guidance, read\n' +
        '[library-guide.md](references/library-guide.md). Answer directly; a repository\n' +
        'or diff is not needed for an overview. For a concrete change, use the routing workflow below.\n\n' +
        '<!-- routes:start -->\n<!-- routes:end -->\n',
    )
    .replace('Do NOT\n  use to explain what the library offers (sw-help)', '');
  const resolved = loadRoutes(router);
  if (resolved === null) throw new Error('pilot router has no reference routes');
  writeFileSync(join(router, 'SKILL.md'), applyTable(candidate, resolved));
  writeFileSync(join(router, 'index.json'), renderIndex(buildIndex(packageRoot)));
}

export function prepareDiscovery(root: string, destination: string): void {
  if (existsSync(destination)) throw new Error(`pilot destination already exists: ${destination}`);
  for (const variant of DISCOVERY_VARIANTS) {
    const packageRoot = join(destination, variant);
    const skills = join(packageRoot, 'skills');
    cpSync(join(root, 'skills'), skills, { recursive: true });
    if (variant === 'current') continue;
    rmSync(join(skills, 'sw-help'), { recursive: true });
    if (variant === 'removed') {
      rmSync(join(skills, 'sw-skill-router'), { recursive: true });
      continue;
    }
    mergeDiscovery(root, packageRoot);
  }
}

export interface DiscoveryOptions {
  root: string;
  destination: string;
  repeats: number;
  env: NodeJS.ProcessEnv;
  log: (text: string) => void;
  run?: (o: RunTaskOptions) => Promise<number>;
  random?: () => number;
}

interface DiscoveryJob {
  task: string;
  variant: DiscoveryVariant;
  repeat: number;
}

function discoveryJobs(repeats: number, random: () => number): DiscoveryJob[] {
  return DISCOVERY_TASKS.flatMap((task) =>
    Array.from({ length: repeats }, (_, i) => {
      const variants: DiscoveryVariant[] = [...DISCOVERY_VARIANTS];
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

async function discoveryTrial(
  o: DiscoveryOptions,
  packages: string,
  job: DiscoveryJob,
  skipCode: number | null,
): Promise<number> {
  const stem = join(o.destination, `${job.task}-${job.variant}-${job.repeat}`);
  let stdout = '';
  let stderr = '';
  const started = Date.now();
  const rc =
    skipCode ??
    (await (o.run ?? runTask)({
      root: o.root,
      task: job.task,
      mode: 'on',
      env: {
        ...o.env,
        EVAL_AGENT_RETRIES: envOr(o.env, 'EVAL_AGENT_RETRIES', '0'),
        EVAL_AGENT_TIMEOUT_SECONDS: envOr(o.env, 'EVAL_AGENT_TIMEOUT_SECONDS', '120'),
        EVAL_SKILLS_ROOT: join(packages, job.variant, 'skills'),
        EVAL_SKILLS_LOG: `${stem}.skills`,
        EVAL_USAGE_LOG: `${stem}.usage`,
        EVAL_TRACE_LOG: `${stem}.trace.jsonl`,
      },
      out: (s) => {
        stdout += s;
      },
      err: (s) => {
        stderr += s;
      },
    }));
  writeFileSync(`${stem}.stdout.txt`, stdout);
  writeFileSync(`${stem}.stderr.txt`, stderr);
  appendFileSync(
    join(o.destination, 'trials.jsonl'),
    `${JSON.stringify({
      ...job,
      exit_code: rc,
      duration_ms: Date.now() - started,
      status: skipCode === null ? (rc === 0 ? 'pass' : rc === 1 ? 'fail' : 'error') : 'skipped',
    })}\n`,
  );
  o.log(
    `${job.task} / ${job.variant} / ${job.repeat}: ${skipCode === null ? (rc === 0 ? 'PASS' : rc === 1 ? 'FAIL' : 'ERROR') : 'SKIPPED'}\n`,
  );
  return rc;
}

/** A block is one task/repeat across all variants, each in a fresh workdir. */
export async function runDiscovery(o: DiscoveryOptions): Promise<number> {
  if (!Number.isSafeInteger(o.repeats) || o.repeats < 1) throw new Error('repeats must be a positive integer');
  prepareDiscovery(o.root, o.destination);
  // Keep installed packages outside the checkout so an agent following a
  // skill symlink cannot recover a removed entry point from an ancestor README.
  const isolated = mkdtempSync(join(envOr(o.env, 'TMPDIR', tmpdir()), 'discovery-packages-'));
  const packages = join(isolated, 'packages');
  mkdirSync(packages);
  for (const variant of DISCOVERY_VARIANTS)
    cpSync(join(o.destination, variant), join(packages, variant), { recursive: true });
  const snapshots = DISCOVERY_VARIANTS.map((variant) => {
    const root = join(o.destination, variant);
    return { variant, skills_hash: contentHash(root, filesUnder(join(root, 'skills'))) };
  });
  writeFileSync(
    join(o.destination, 'manifest.json'),
    `${JSON.stringify(
      {
        version: 1,
        tasks: DISCOVERY_TASKS,
        task_snapshots: DISCOVERY_TASKS.map((task) => {
          const { task_hash, grader_hash } = provenance(o.root, task);
          return { task, task_hash, grader_hash };
        }),
        variants: snapshots,
        repeats: o.repeats,
        agent: envOr(o.env, 'EVAL_AGENT', 'unknown'),
        model: envOr(o.env, 'TASK_MODEL', 'default'),
        purpose: 'Packaging screen; no retirement or non-inferiority claim.',
      },
      null,
      2,
    )}\n`,
  );
  const jobs = discoveryJobs(o.repeats, o.random ?? Math.random);
  let errors = 0;
  let skipCode: number | null = null;
  try {
    await inSeries(jobs, async (job) => {
      const rc = await discoveryTrial(o, packages, job, skipCode);
      if (rc > RUN.fail) skipCode = rc;
      if (rc > RUN.fail) errors++;
    });
  } finally {
    rmSync(isolated, { recursive: true, force: true });
  }
  return errors > 0 ? 2 : 0;
}
