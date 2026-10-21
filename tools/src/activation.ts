// Layer 1: activation evals (plan WP10 step 4; ported from
// scripts/run-activation-evals.sh, which is now a wrapper and documents the
// environment).
//
// Every prompt in a skill's evals/should-trigger.md must activate the skill;
// every prompt in evals/should-not-trigger.md must not. The activation
// command reads a prompt on stdin and prints the skills it activated, one
// per line or space or comma separated. Without a command the run is dry: it
// checks that every skill has both files and lists the prompts.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { envOr } from './env.ts';
import { run } from './proc.ts';
import { inSeries } from './series.ts';
import { compareText } from './text.ts';

export type Expect = 'trigger' | 'no-trigger';

const FILES: readonly [string, Expect][] = [
  ['should-trigger.md', 'trigger'],
  ['should-not-trigger.md', 'no-trigger'],
];

/** A reviewer note at the end of a prompt, such as "(-> shopware-testing)",
 *  which would tell the agent the expected skill. */
const NOTE = /\s*\((?:->|should|redirect|[a-z-]*shopware[a-z-]*|php-foundation)[^)]*\)\.?\s*$/u;

/** The prompts of an eval file: its "- " list items, without surrounding
 *  quotes and without a trailing reviewer note. */
export function extractPrompts(markdown: string): string[] {
  return markdown
    .split('\n')
    .filter((line) => line.startsWith('- '))
    .map((line) => {
      const item = line.slice(2);
      const quoted = /^"([^"]*)"/u.exec(item);
      return (quoted?.[1] ?? item).replace(NOTE, '');
    })
    .filter((prompt) => prompt !== '');
}

/** True when the command output names `skill` as a whole entry. */
export function activated(output: string, skill: string): boolean {
  return output.split(/[\s,]+/u).includes(skill);
}

export interface ActivationOptions {
  root: string;
  env: NodeJS.ProcessEnv;
  out: (text: string) => void;
  /** The activation command's own stderr. */
  err: (text: string) => void;
}

interface Tally {
  pass: number;
  fail: number;
  missing: number;
  errors: number;
}

/** The first `n` code points of `text`, like bash `${text:0:n}` in a UTF-8 locale. */
const head = (text: string, n: number): string => Array.from(text).slice(0, n).join('');

/** Runs one prompt; the command's output, or null when it failed. */
async function ask(cmd: string, prompt: string, o: ActivationOptions): Promise<string | null> {
  const r = await run('bash', ['-c', cmd], { env: o.env, input: prompt, onStderr: o.err });
  return r.status === 0 ? r.stdout : null;
}

/** Scores the prompts of one file. Stops at the first agent error: a
 *  provider that fails once fails the run, so it never reads as "quiet". */
async function checkFile(
  o: ActivationOptions,
  cmd: string,
  skill: string,
  file: string,
  expect: Expect,
  t: Tally,
): Promise<void> {
  if (!existsSync(join(o.root, file))) {
    o.out(`  MISSING: ${file}\n`);
    t.missing++;
    return;
  }
  const prompts = extractPrompts(readFileSync(join(o.root, file), 'utf8'));
  if (cmd === '') {
    for (const p of prompts) o.out(`  [dry] (${expect}) ${skill} <- ${head(p, 60)}...\n`);
    return;
  }
  await inSeries(prompts, async (prompt) => {
    if (t.errors > 0) return;
    const output = await ask(cmd, prompt, o);
    if (output === null) {
      t.errors++;
      o.out(`  ERROR (${expect}) ${skill} <- ${prompt} (agent failed; no score recorded)\n`);
      return;
    }
    const got = activated(output, skill) ? 'triggered' : 'quiet';
    if ((expect === 'trigger') === (got === 'triggered')) {
      t.pass++;
    } else {
      t.fail++;
      o.out(`  FAIL (${expect}, got ${got}) ${skill} <- ${prompt}\n`);
    }
  });
}

/** Runs the activation evals for every skill; 0 when all pass, else 1. */
export async function runActivation(o: ActivationOptions): Promise<number> {
  const cmd = envOr(o.env, 'SKILLS_ACTIVATION_CMD', envOr(o.env, 'SKILLS_AGENT_CMD', ''));
  if (cmd === '') {
    o.out('SKILLS_ACTIVATION_CMD not set -> running in --dry mode (no model calls).\n');
    o.out('Set it to an agent that prints activated skill names to validate for real.\n\n');
  }
  const skills = readdirSync(join(o.root, 'skills'), { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .toSorted(compareText);
  const t: Tally = { pass: 0, fail: 0, missing: 0, errors: 0 };
  await inSeries(skills, async (skill) => {
    if (t.errors > 0) return;
    o.out(`Skill: ${skill}\n`);
    await inSeries(FILES, async ([name, expect]) => {
      await checkFile(o, cmd, skill, `skills/${skill}/evals/${name}`, expect, t);
    });
  });
  o.out(`\nActivation evals: pass=${t.pass} fail=${t.fail} missing-files=${t.missing} errors=${t.errors}\n`);
  return t.fail > 0 || t.missing > 0 || t.errors > 0 ? 1 : 0;
}
