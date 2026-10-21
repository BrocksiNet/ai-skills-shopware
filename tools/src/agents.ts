// Agent adapters for the evals (plan WP10 step 3; ported from
// evals/runner/{opencode,claude}-{task,activation}.sh, which are now wrappers
// and still document the environment of each adapter).
//
// Task adapters (SKILLS_AGENT_CMD) read the task prompt, let the agent edit
// the current directory, print the assistant's text as the transcript, and
// exit 0 when the session finished or 4 on an agent error. They log loaded
// skills to EVAL_SKILLS_LOG and "<input> <output>" tokens to EVAL_USAGE_LOG.
//
// Activation adapters (SKILLS_ACTIVATION_CMD) run a prompt in an empty
// workspace that exposes only the repo skills and print each skill the model
// loaded, one per line. A CLI or API error fails the run, so it never looks
// like "no activation".
import { appendFileSync, chmodSync, copyFileSync, existsSync, mkdirSync, mkdtempSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CLAUDE_CAPS, type Usage, parseClaude, parseOpencode } from './agent-events.ts';
import { onPath, run, tail } from './proc.ts';

export interface AdapterIo {
  out: (text: string) => void;
  err: (text: string) => void;
}

export type Adapter = (prompt: string, env: NodeJS.ProcessEnv, io: AdapterIo, root: string) => Promise<number>;

/** Task adapter exit code for an agent error; run-task never grades it. */
const AGENT_ERROR = 4;
const OPENCODE_FREE_MODEL = 'opencode/longcat-2.5-preview-free';

const positive = (v: string): boolean => /^[1-9][0-9]*$/.test(v);

function logSkills(env: NodeJS.ProcessEnv, skills: string[]): void {
  if (env.EVAL_SKILLS_LOG) appendFileSync(env.EVAL_SKILLS_LOG, skills.map((s) => `${s}\n`).join(''));
}

function logUsage(env: NodeJS.ProcessEnv, usage: Usage | null): void {
  if (env.EVAL_USAGE_LOG && usage) appendFileSync(env.EVAL_USAGE_LOG, `${usage.input} ${usage.output}\n`);
}

/** HOME and XDG folders in `scratch`, so no user config, login or global
 *  skills reach OpenCode. */
function isolatedHome(env: NodeJS.ProcessEnv, scratch: string): NodeJS.ProcessEnv {
  const home = join(scratch, 'home');
  const xdg = {
    XDG_CONFIG_HOME: join(home, '.config'),
    XDG_DATA_HOME: join(home, '.local/share'),
    XDG_CACHE_HOME: join(home, '.cache'),
    XDG_STATE_HOME: join(home, '.local/state'),
  };
  for (const dir of Object.values(xdg)) mkdirSync(dir, { recursive: true });
  return { ...env, HOME: home, ...xdg };
}

const opencodeEnv = (env: NodeJS.ProcessEnv, config: object): NodeJS.ProcessEnv => ({
  ...env,
  OPENCODE_DISABLE_AUTOUPDATE: '1',
  OPENCODE_DISABLE_LSP_DOWNLOAD: '1',
  OPENCODE_CONFIG_CONTENT: JSON.stringify(config),
});

const opencodeArgs = (model: string, prompt: string): string[] => ['run', '--standalone', '--auto', '--format', 'json', '-m', model, prompt];

export const opencodeTask: Adapter = async (prompt, env, { out, err }) => {
  const model = env.TASK_MODEL || OPENCODE_FREE_MODEL;
  const maxTurns = env.TASK_MAX_TURNS || '12';
  const timeout = env.TASK_TIMEOUT_SECONDS || '600';
  if (!onPath('opencode', env)) return (err('opencode CLI not found\n'), AGENT_ERROR);
  if (!positive(maxTurns)) return (err('TASK_MAX_TURNS must be >= 1\n'), AGENT_ERROR);
  if (!positive(timeout)) return (err('TASK_TIMEOUT_SECONDS must be >= 1\n'), AGENT_ERROR);

  const scratch = mkdtempSync(join(env.TMPDIR || tmpdir(), 'opencode-task.'));
  try {
    let childEnv = env;
    if ((env.OPENCODE_ISOLATE || '1') === '1') {
      childEnv = isolatedHome(env, scratch);
      if (env.OPENCODE_AUTH_FILE) {
        if (!existsSync(env.OPENCODE_AUTH_FILE)) return (err(`OPENCODE_AUTH_FILE not found: ${env.OPENCODE_AUTH_FILE}\n`), AGENT_ERROR);
        const auth = join(childEnv.XDG_DATA_HOME!, 'opencode/auth.json');
        mkdirSync(join(childEnv.XDG_DATA_HOME!, 'opencode'), { recursive: true });
        copyFileSync(env.OPENCODE_AUTH_FILE, auth);
        chmodSync(auth, 0o600);
      }
    }
    // Cap the agent loop; a headless run must never stop to ask a question.
    childEnv = opencodeEnv(childEnv, { agent: { build: { steps: Number(maxTurns) } }, permission: { question: 'deny' } });
    const proc = await run('opencode', opencodeArgs(model, prompt), { env: childEnv, timeoutSeconds: Number(timeout) });

    const s = parseOpencode(proc.stdout);
    out(`${s.texts.join('\n\n')}\n`);
    logSkills(env, s.skills);
    logUsage(env, s.usage);
    let failed = false;
    if (s.errors.length > 0) {
      err(`opencode-task: ${s.errors[0]}\n`);
      failed = true;
    } else if (s.texts.length === 0 && s.tools === 0) {
      err('opencode-task: session produced no text and no tool call\n');
      failed = true;
    }
    if (proc.timedOut) return (err(`opencode-task: timed out after ${timeout}s\n`), AGENT_ERROR);
    if (proc.status !== 0) {
      err(`opencode-task: opencode exited ${proc.status}\n${tail(proc.stderr, 5)}`);
      return AGENT_ERROR;
    }
    return failed ? AGENT_ERROR : 0;
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
};

export const claudeTask: Adapter = async (prompt, env, { out, err }) => {
  const model = env.TASK_MODEL || 'sonnet';
  const maxTurns = env.TASK_MAX_TURNS || '12';
  const maxBudget = env.TASK_MAX_BUDGET_USD || '0.75';
  if (!onPath('claude', env)) return (err('claude CLI not found\n'), AGENT_ERROR);

  const args = ['-p', '--setting-sources', 'project', '--model', model, '--max-turns', maxTurns, '--max-budget-usd', maxBudget];
  args.push('--dangerously-skip-permissions', '--no-session-persistence', '--output-format', 'stream-json', '--verbose');
  const proc = await run('claude', args, { env, input: prompt, onStderr: err });

  const s = parseClaude(proc.stdout);
  out(`${s.texts.join('\n\n')}\n`);
  logSkills(env, s.skills);
  const r = s.result;
  if (r === null) return (err('claude-task: session ended without a result\n'), AGENT_ERROR);
  logUsage(env, r.usage);
  if (CLAUDE_CAPS.includes(r.subtype)) {
    err(`claude-task: stopped at ${r.subtype}\n`);
  } else if (r.isError || r.subtype !== 'success') {
    return (err(`claude-task: ${r.message || r.subtype || 'unknown error'}\n`), AGENT_ERROR);
  }
  // claude exits 1 when it stops at a turn or budget cap, accepted above; any
  // other non-zero exit (crash, signal) is an agent error.
  return proc.status === 0 || proc.status === 1 ? 0 : AGENT_ERROR;
};

/** A temp workspace whose only project skills are `skillsDir`, linked as
 *  `<dot>/skills`. */
function activationWorkspace(env: NodeJS.ProcessEnv, skillsDir: string, dot: '.agents' | '.claude'): { scratch: string; ws: string } {
  const scratch = mkdtempSync(join(env.TMPDIR || tmpdir(), 'skills-activation.'));
  const ws = join(scratch, 'ws');
  mkdirSync(join(ws, dot), { recursive: true });
  symlinkSync(skillsDir, join(ws, dot, 'skills'));
  return { scratch, ws };
}

export const opencodeActivation: Adapter = async (prompt, env, { out, err }, root) => {
  const skillsDir = env.ACTIVATION_SKILLS_DIR || join(root, 'skills');
  const model = env.ACTIVATION_MODEL || OPENCODE_FREE_MODEL;
  const maxTurns = env.ACTIVATION_MAX_TURNS || '3';
  if (!onPath('opencode', env)) return (err('opencode CLI not found\n'), 2);
  if (!positive(maxTurns)) return (err('ACTIVATION_MAX_TURNS must be >= 1\n'), 2);

  const { scratch, ws } = activationWorkspace(env, skillsDir, '.agents');
  try {
    // Edits and shell are denied, so a run cannot change anything.
    const deny = { edit: 'deny', bash: 'deny', webfetch: 'deny', websearch: 'deny', task: 'deny', question: 'deny' };
    const childEnv = opencodeEnv(isolatedHome(env, scratch), { agent: { build: { steps: Number(maxTurns) } }, permission: deny });
    const proc = await run('opencode', opencodeArgs(model, prompt), { cwd: ws, env: childEnv, onStderr: err });
    const s = parseOpencode(proc.stdout);
    if (s.errors.length > 0) return (err(`Activation session failed: ${s.errors[0]}\n`), 1);
    if (s.events === 0) return (err('Activation session produced no events; no score recorded.\n'), 1);
    out(`${s.skills.join('\n')}\n`);
    return proc.status;
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
};

export const claudeActivation: Adapter = async (prompt, env, { out, err }, root) => {
  const skillsDir = env.ACTIVATION_SKILLS_DIR || join(root, 'skills');
  const model = env.ACTIVATION_MODEL || 'sonnet';
  const maxTurns = env.ACTIVATION_MAX_TURNS || '3';
  if (!onPath('claude', env)) return (err('claude CLI not found\n'), 2);

  const { scratch, ws } = activationWorkspace(env, skillsDir, '.claude');
  try {
    // Only project settings, and read-only tools plus Skill.
    const args = ['-p', '--setting-sources', 'project', '--model', model, '--tools', 'Skill', 'Read', 'Glob', 'Grep'];
    args.push('--max-turns', maxTurns, '--no-session-persistence', '--output-format', 'stream-json', '--verbose');
    const proc = await run('claude', args, { cwd: ws, env, input: prompt, onStderr: err });
    const s = parseClaude(proc.stdout);
    const r = s.result;
    if (r === null) return (err('Activation session ended without a result; no score recorded.\n'), 1);
    if (r.isError || r.subtype !== 'success') return (err(`Activation session failed: ${r.message || r.subtype || 'unknown error'}\n`), 1);
    out(`${s.skills.join('\n')}\n`);
    return proc.status;
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
};

export const ADAPTERS: Record<string, Adapter> = {
  'opencode-task': opencodeTask,
  'claude-task': claudeTask,
  'opencode-activation': opencodeActivation,
  'claude-activation': claudeActivation,
};
