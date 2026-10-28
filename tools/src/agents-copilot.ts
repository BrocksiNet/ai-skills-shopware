// The GitHub Copilot CLI adapters (`copilot -p`), the second eval model next
// to the free OpenCode one. evals/runner/copilot-{task,activation}.sh are the
// wrappers and document the environment. The task and activation contract is
// the one in agents.ts.
import { existsSync, mkdirSync, readdirSync, realpathSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { parseCopilot } from './agent-events.ts';
import {
  AGENT_ERROR,
  type Adapter,
  activationWorkspace,
  isolatedHome,
  logSkills,
  logUsage,
  positive,
  scratchDir,
} from './agents.ts';
import { envOr } from './env.ts';
import { ghToken, onPath, run, tail } from './proc.ts';

/** The cheapest Copilot model that loads skills: a third of a premium
 *  request per session (measured 2026-10-26 with Copilot CLI 1.0.103). */
export const COPILOT_DEFAULT_MODEL = 'claude-haiku-4.5';

/** The Copilot environment: a throwaway HOME and COPILOT_HOME, so no user
 *  login, config or personal skills (~/.copilot/skills, ~/.agents/skills)
 *  reach the run. The token comes from COPILOT_GITHUB_TOKEN or GH_TOKEN. */
function copilotEnv(env: NodeJS.ProcessEnv, scratch: string): NodeJS.ProcessEnv | null {
  if (envOr(env, 'COPILOT_GITHUB_TOKEN', '') === '' && envOr(env, 'GH_TOKEN', '') === '') return null;
  const home = isolatedHome(env, scratch).env;
  const copilotHome = join(scratch, 'home/.copilot');
  mkdirSync(copilotHome, { recursive: true });
  return { ...home, COPILOT_HOME: copilotHome, COPILOT_AUTO_UPDATE: 'false' };
}

const COPILOT_NO_TOKEN =
  'COPILOT_GITHUB_TOKEN not set: a fine-grained token with the "Copilot Requests" permission (locally `gh auth token` works)\n';

/** Flags every Copilot run shares: headless, JSON events, no GitHub MCP
 *  server, and the token kept out of the agent's shell. */
export const copilotArgs = (model: string, prompt: string, tools: readonly string[]): string[] => [
  '-p',
  prompt,
  '--model',
  model,
  '--output-format',
  'json',
  '--no-ask-user',
  '--no-auto-update',
  '--disable-builtin-mcps',
  '--disable-client-telemetry',
  '--secret-env-vars',
  'COPILOT_GITHUB_TOKEN,GH_TOKEN,GITHUB_TOKEN',
  ...tools,
];

/** `--add-dir` for every skill linked into `cwd`. The links point outside
 *  the workdir, and Copilot denies reading files there without a grant: the
 *  skill tool still loads SKILL.md, but its references stay unreadable. Only
 *  linked skills get a grant, so a skill-off run (no links) gets none. */
export function skillDirGrants(cwd: string): string[] {
  const dirs = new Set<string>();
  for (const sub of ['.agents/skills', '.claude/skills']) {
    const dir = join(cwd, sub);
    if (!existsSync(dir)) continue;
    for (const name of readdirSync(dir)) {
      try {
        dirs.add(realpathSync(join(dir, name)));
      } catch {
        // a dangling link grants nothing
      }
    }
  }
  return [...dirs].toSorted().flatMap((d) => ['--add-dir', d]);
}

/** Task runs: every tool except the web (OpenCode runs have no web search
 *  either). The workdir is a throwaway copy of a fixture. */
const COPILOT_TASK_TOOLS = ['--allow-all-tools', '--excluded-tools', 'web_fetch', 'fetch_copilot_cli_documentation'];
/** Activation runs: read-only tools plus the skill tool. */
const COPILOT_READ_TOOLS = ['skill', 'view', 'glob', 'grep'];
const COPILOT_ACTIVATION_TOOLS = ['--available-tools', ...COPILOT_READ_TOOLS, '--allow-tool', ...COPILOT_READ_TOOLS];

/** A token for Copilot: COPILOT_GITHUB_TOKEN, GH_TOKEN, or your `gh` login.
 *  Set before `withoutTokens` strips GH_TOKEN from an agent's environment. */
export function withCopilotToken(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  if (envOr(env, 'COPILOT_GITHUB_TOKEN', '') !== '') return env;
  const token = envOr(env, 'GH_TOKEN', '') || ghToken(env);
  return token === '' ? env : { ...env, COPILOT_GITHUB_TOKEN: token };
}

export interface CopilotSessionOptions {
  /** Prefix of error lines and the scratch folder. */
  label: string;
  prompt: string;
  model: string;
  tools: readonly string[];
  env: NodeJS.ProcessEnv;
  /** Where the session works; the current directory when unset. */
  cwd?: string;
  timeoutSeconds?: number;
  err: (text: string) => void;
}

export interface CopilotSession {
  /** 0 when the session finished, else AGENT_ERROR. */
  status: number;
  text: string;
  skills: string[];
}

/** Why a finished process is not a finished session, or null. */
function sessionFailure(
  s: ReturnType<typeof parseCopilot>,
  proc: Awaited<ReturnType<typeof run>>,
  timeout?: number,
): string | null {
  if (proc.timedOut) return `timed out after ${String(timeout)}s\n`;
  if (s.errors.length > 0) return `${s.errors[0]}\n`;
  if (s.exitCode === null) return `session ended without a result\n${tail(proc.stderr, 5)}`;
  if (proc.status !== 0) return `copilot exited ${proc.status}\n${tail(proc.stderr, 5)}`;
  if (s.exitCode !== 0) return `session exit code ${s.exitCode}\n`;
  if (s.texts.length === 0 && s.tools === 0) return 'session produced no text and no tool call\n';
  return null;
}

/** One headless Copilot session with an isolated HOME. Logs tokens to
 *  EVAL_USAGE_LOG; linked skill folders in `cwd` get a read grant. */
export async function copilotSession(o: CopilotSessionOptions): Promise<CopilotSession> {
  const failed = (why: string): CopilotSession => (
    o.err(`${o.label}: ${why}`),
    { status: AGENT_ERROR, text: '', skills: [] }
  );
  if (!onPath('copilot', o.env)) return failed('copilot CLI not found\n');
  const scratch = scratchDir(o.env, `${o.label}.`);
  try {
    const childEnv = copilotEnv(o.env, scratch);
    if (childEnv === null) return failed(COPILOT_NO_TOKEN);
    const cwd = o.cwd ?? process.cwd();
    const proc = await run('copilot', copilotArgs(o.model, o.prompt, [...o.tools, ...skillDirGrants(cwd)]), {
      cwd,
      env: childEnv,
      ...(o.timeoutSeconds === undefined ? {} : { timeoutSeconds: o.timeoutSeconds }),
    });
    const s = parseCopilot(proc.stdout);
    logUsage(o.env, s.usage);
    const session = { status: 0, text: s.texts.join('\n\n'), skills: s.skills };
    const why = sessionFailure(s, proc, o.timeoutSeconds);
    if (why === null) return session;
    o.err(`${o.label}: ${why}`);
    return { ...session, status: AGENT_ERROR };
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

export const copilotTask: Adapter = async (prompt, env, { out, err }) => {
  const timeout = envOr(env, 'TASK_TIMEOUT_SECONDS', '600');
  if (!positive(timeout)) return (err('TASK_TIMEOUT_SECONDS must be >= 1\n'), AGENT_ERROR);
  // Review tasks only read a diff; read-only runs are safe on a laptop.
  const tools = envOr(env, 'COPILOT_TASK_READ_ONLY', '0') === '1' ? COPILOT_ACTIVATION_TOOLS : COPILOT_TASK_TOOLS;
  const s = await copilotSession({
    label: 'copilot-task',
    prompt,
    model: envOr(env, 'TASK_MODEL', COPILOT_DEFAULT_MODEL),
    tools,
    env,
    timeoutSeconds: Number(timeout),
    err,
  });
  out(`${s.text}\n`);
  logSkills(env, s.skills);
  return s.status;
};

export const copilotActivation: Adapter = async (prompt, env, { out, err }, root) => {
  const skillsDir = envOr(env, 'ACTIVATION_SKILLS_DIR', join(root, 'skills'));
  const model = envOr(env, 'ACTIVATION_MODEL', COPILOT_DEFAULT_MODEL);
  if (!onPath('copilot', env)) return (err('copilot CLI not found\n'), 2);

  const { scratch, ws } = activationWorkspace(env, skillsDir, '.agents');
  try {
    const childEnv = copilotEnv(env, scratch);
    if (childEnv === null) return (err(COPILOT_NO_TOKEN), 2);
    const proc = await run(
      'copilot',
      copilotArgs(model, prompt, [...COPILOT_ACTIVATION_TOOLS, ...skillDirGrants(ws)]),
      {
        cwd: ws,
        env: childEnv,
        onStderr: err,
      },
    );
    const s = parseCopilot(proc.stdout);
    if (s.errors.length > 0) return (err(`Activation session failed: ${s.errors[0]}\n`), 1);
    if (s.exitCode === null) return (err('Activation session ended without a result; no score recorded.\n'), 1);
    out(`${s.skills.join('\n')}\n`);
    return proc.status;
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
};
