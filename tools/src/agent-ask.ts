// Ask adapters for `suggest-rules` (plan WP12 step 4): one question, one
// answer, no tools. The prompt carries untrusted text (review comments,
// upstream lines) as quoted data, so the session can neither read files, run
// commands nor reach the network, and gets no GitHub or package token.
import { mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { CLAUDE_CAPS, parseClaude, parseOpencode } from './agent-events.ts';
import {
  type Adapter,
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

const TOKEN_VAR = /^(?:GH|GITHUB|NPM|NODE_AUTH|COMPOSER_AUTH)(?:_[A-Z_]*)?(?:TOKEN|AUTH)$/u;

/** GitHub and package tokens never reach an agent that reads untrusted
 *  text; the agent's own login stays. */
export function withoutTokens(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  return Object.fromEntries(Object.entries(env).filter(([k]) => !TOKEN_VAR.test(k)));
}

/** Ask adapters (`suggest-rules`): one question, one answer, no tools. The
 *  prompt carries untrusted text as quoted data, so the session can neither
 *  read files, run commands nor reach the network. Prints the answer text;
 *  exit 0 on a finished session, 4 on an agent error. */
export const claudeAsk: Adapter = async (prompt, env, { out, err }) => {
  const model = envOr(env, 'SUGGEST_MODEL', 'haiku');
  if (!onPath('claude', env)) return (err('claude CLI not found\n'), AGENT_ERROR);
  const scratch = scratchDir(env, 'suggest-ask.');
  try {
    const args = [
      '-p',
      '--setting-sources',
      'project',
      '--model',
      model,
      '--tools',
      '',
      '--strict-mcp-config',
      '--max-turns',
      '2',
      '--no-session-persistence',
      '--output-format',
      'stream-json',
      '--verbose',
    ];
    const proc = await run('claude', args, { cwd: scratch, env: withoutTokens(env), input: prompt, onStderr: err });
    const s = parseClaude(proc.stdout);
    const r = s.result;
    if (r === null) return (err('claude-ask: session ended without a result\n'), AGENT_ERROR);
    logUsage(env, r.usage);
    if (r.isError || (r.subtype !== 'success' && !CLAUDE_CAPS.includes(r.subtype)))
      return (err(`claude-ask: ${r.message || r.subtype || 'unknown error'}\n`), AGENT_ERROR);
    out(`${s.texts.join('\n\n')}\n`);
    return 0;
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
};

export const opencodeAsk: Adapter = async (prompt, env, { out, err }) => {
  const model = envOr(env, 'SUGGEST_MODEL', OPENCODE_FREE_MODEL);
  if (!onPath('opencode', env)) return (err('opencode CLI not found\n'), AGENT_ERROR);
  const scratch = scratchDir(env, 'suggest-ask.');
  try {
    const baseEnv = opencodeTaskEnv(withoutTokens(env), scratch, err);
    if (baseEnv === null) return AGENT_ERROR;
    const deny = { edit: 'deny', bash: 'deny', webfetch: 'deny', websearch: 'deny', task: 'deny', question: 'deny' };
    const ws = join(scratch, 'ws');
    mkdirSync(ws);
    const childEnv = opencodeEnv(baseEnv, { agent: { build: { steps: 2 } }, permission: deny });
    const proc = await run('opencode', opencodeArgs(model, prompt), { cwd: ws, env: childEnv, onStderr: err });
    const s = parseOpencode(proc.stdout);
    logUsage(env, s.usage);
    if (s.errors.length > 0) return (err(`opencode-ask: ${s.errors[0]}\n`), AGENT_ERROR);
    if (proc.status !== 0) return (err(`opencode-ask: opencode exited ${proc.status}\n`), AGENT_ERROR);
    out(`${s.texts.join('\n\n')}\n`);
    return 0;
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
};

/** One agent session: the answer text and the adapter's exit code. */
export type Ask = (prompt: string) => Promise<{ status: number; text: string }>;

const ASK_ADAPTERS: Record<string, Adapter> = { claude: claudeAsk, opencode: opencodeAsk };

/** Questions through an ask adapter (`claude`, `opencode`), or through a
 *  command that reads the prompt on stdin and prints the answer (the fake
 *  agent in tests). */
export function asker(root: string, agent: string, env: NodeJS.ProcessEnv, err: (t: string) => void): Ask {
  const adapter = ASK_ADAPTERS[agent];
  if (adapter !== undefined) {
    return async (prompt) => {
      let text = '';
      const out = (t: string): void => {
        text += t;
      };
      const status = await adapter(prompt, env, { out, err }, root);
      return { status, text };
    };
  }
  return async (prompt) => {
    const proc = await run(agent, [], { env: withoutTokens(env), input: prompt, onStderr: err });
    return { status: proc.status, text: proc.stdout };
  };
}
