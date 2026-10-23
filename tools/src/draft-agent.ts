// Edit adapters for `suggest-rules draft` (plan WP12 step 5): the agent
// changes files in a worktree and runs the repo's checks, nothing else. It
// gets file and test tools only, no web tools, no MCP servers and no GitHub
// or package token, as far as each CLI allows.
import { rmSync } from 'node:fs';
import { CLAUDE_CAPS, parseClaude, parseOpencode } from './agent-events.ts';
import { withoutTokens } from './agent-ask.ts';
import {
  AGENT_ERROR,
  logUsage,
  OPENCODE_FREE_MODEL,
  opencodeArgs,
  opencodeEnv,
  opencodeTaskEnv,
  scratchDir,
} from './agents.ts';
import { envOr } from './env.ts';
import { onPath, run } from './proc.ts';

/** One editing session in `cwd`: the agent's final text and exit code. */
export type Edit = (prompt: string, cwd: string) => Promise<{ status: number; text: string }>;

/** Commands the agent may run: the repo's own checks and generators. */
const BASH_ALLOWED = ['node *', 'bash scripts/*', 'bash evals/*', 'npm test*', 'npm run *', 'ls *', 'mkdir *'];

const claudeArgs = (env: NodeJS.ProcessEnv): string[] => [
  '-p',
  // Not --restricted: it denies every Bash call under dontAsk, even allowed ones.
  '--setting-sources',
  'project',
  '--strict-mcp-config',
  '--model',
  envOr(env, 'DRAFT_MODEL', 'haiku'),
  '--tools',
  'Read,Edit,Write,Glob,Grep,Bash',
  '--allowedTools',
  ['Read', 'Edit', 'Write', 'Glob', 'Grep', ...BASH_ALLOWED.map((c) => `Bash(${c})`)].join(','),
  '--permission-mode',
  'dontAsk',
  '--max-turns',
  envOr(env, 'DRAFT_MAX_TURNS', '60'),
  '--max-budget-usd',
  envOr(env, 'DRAFT_MAX_BUDGET_USD', '2'),
  '--no-session-persistence',
  '--output-format',
  'stream-json',
  '--verbose',
];

type Edited = Awaited<ReturnType<Edit>>;

async function claudeEdit(
  prompt: string,
  cwd: string,
  env: NodeJS.ProcessEnv,
  err: (t: string) => void,
): Promise<Edited> {
  if (!onPath('claude', env)) return (err('claude CLI not found\n'), { status: AGENT_ERROR, text: '' });
  const proc = await run('claude', claudeArgs(env), { cwd, env: withoutTokens(env), input: prompt, onStderr: err });
  const s = parseClaude(proc.stdout);
  const text = s.texts.join('\n\n');
  const r = s.result;
  if (r === null) return (err('claude-draft: session ended without a result\n'), { status: AGENT_ERROR, text });
  logUsage(env, r.usage);
  if (r.isError || (r.subtype !== 'success' && !CLAUDE_CAPS.includes(r.subtype)))
    return (err(`claude-draft: ${r.message || r.subtype || 'unknown error'}\n`), { status: AGENT_ERROR, text });
  return { status: 0, text };
}

async function opencodeEdit(
  prompt: string,
  cwd: string,
  env: NodeJS.ProcessEnv,
  err: (t: string) => void,
): Promise<Edited> {
  if (!onPath('opencode', env)) return (err('opencode CLI not found\n'), { status: AGENT_ERROR, text: '' });
  const scratch = scratchDir(env, 'suggest-draft.');
  try {
    const baseEnv = opencodeTaskEnv(withoutTokens(env), scratch, err);
    if (baseEnv === null) return { status: AGENT_ERROR, text: '' };
    const bash: Record<string, string> = { '*': 'deny' };
    for (const c of BASH_ALLOWED) bash[c] = 'allow';
    const permission = { edit: 'allow', bash, webfetch: 'deny', websearch: 'deny', task: 'deny', question: 'deny' };
    const childEnv = opencodeEnv(baseEnv, { permission });
    const model = envOr(env, 'DRAFT_MODEL', OPENCODE_FREE_MODEL);
    const proc = await run('opencode', opencodeArgs(model, prompt), { cwd, env: childEnv, onStderr: err });
    const s = parseOpencode(proc.stdout);
    logUsage(env, s.usage);
    const text = s.texts.join('\n\n');
    if (s.errors.length > 0) return (err(`opencode-draft: ${s.errors[0]}\n`), { status: AGENT_ERROR, text });
    return { status: proc.status === 0 ? 0 : AGENT_ERROR, text };
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

/** Edits through `claude`, `opencode`, or a command that reads the prompt on
 *  stdin and works in its current directory (the fake agent in tests). */
export function editor(agent: string, env: NodeJS.ProcessEnv, err: (t: string) => void): Edit {
  if (agent === 'claude') return (prompt, cwd) => claudeEdit(prompt, cwd, env, err);
  if (agent === 'opencode') return (prompt, cwd) => opencodeEdit(prompt, cwd, env, err);
  return async (prompt, cwd) => {
    const proc = await run(agent, [], { cwd, env: withoutTokens(env), input: prompt, onStderr: err });
    return { status: proc.status, text: proc.stdout };
  };
}
