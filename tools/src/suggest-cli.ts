// The command line of `suggest-rules` (tools/bin/suggest-rules.ts documents
// the options): flags and environment to SuggestOptions, the agent to ask,
// and the run with its files and summary line.
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { askModel, asker } from './agent-ask.ts';
import { envInt, envOr } from './env.ts';
import { githubApi } from './github.ts';
import { parseSince } from './suggest-load.ts';
import { writeSuggestions } from './suggest-render.ts';
import { latestBaseline } from './suggest-retire.ts';
import { DEFAULT_MAX_CLUSTERS, DEFAULT_MAX_SIGNALS, readResult, SUGGESTIONS_DIR, suggest } from './suggest-run.ts';

/** The parsed flags; tools/bin/suggest-rules.ts documents them. */
export interface SuggestFlags {
  since?: string | undefined;
  until?: string | undefined;
  skill?: string | undefined;
  signals?: string | undefined;
  agent: string;
  source: string[];
  offline: boolean;
  out?: string | undefined;
  'api-index'?: string | undefined;
  baseline?: string | undefined;
  continue?: string | undefined;
}

export const DEFAULT_SINCE = '30d';

/** `--api-index`, `$API_INDEX`, or the cache api-facts downloads into. */
export function apiIndexPath(explicit: string | undefined, env: NodeJS.ProcessEnv): string {
  if (explicit !== undefined) return explicit;
  const fromEnv = envOr(env, 'API_INDEX', '');
  if (fromEnv !== '') return fromEnv;
  return join(
    envOr(env, 'XDG_CACHE_HOME', join(homedir(), '.cache')),
    'ai-skills-shopware/api-index/api-index.json.gz',
  );
}

/** "<input> <output>" lines of EVAL_USAGE_LOG, summed. */
export function sumUsage(log: string): string {
  if (!existsSync(log)) return 'not reported';
  let input = 0;
  let output = 0;
  for (const line of readFileSync(log, 'utf8').split('\n')) {
    const [i = '0', o = '0'] = line.split(' ');
    input += Number(i) || 0;
    output += Number(o) || 0;
  }
  return `${String(input)} in / ${String(output)} out`;
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url, { redirect: 'follow' });
  if (!response.ok) throw new Error(`${url}: HTTP ${String(response.status)}`);
  return response.text();
}

/** Runs suggest-rules for parsed flags; returns the summary line and the
 *  files written. */
export async function suggestCommand(
  root: string,
  f: SuggestFlags,
  baseEnv: NodeJS.ProcessEnv,
  log: (t: string) => void,
): Promise<string> {
  const now = new Date();
  const scratch = mkdtempSync(join(tmpdir(), 'suggest-rules.'));
  const usageLog = join(scratch, 'usage.log');
  const env = { ...baseEnv, EVAL_USAGE_LOG: usageLog };
  try {
    const baseline = f.baseline ?? latestBaseline(root);
    const previous = f.continue === undefined ? undefined : readResult(resolve(f.continue));
    if (previous !== undefined && (f.since !== undefined || f.until !== undefined))
      throw new Error('--continue takes the window of the earlier run; drop --since and --until');
    const result = await suggest({
      root,
      now,
      since: previous?.window.since ?? parseSince(f.since ?? DEFAULT_SINCE, now),
      until:
        previous?.window.until ?? (f.until === undefined ? now.toISOString().slice(0, 10) : parseSince(f.until, now)),
      ...(previous === undefined ? {} : { previous }),
      ...(f.skill === undefined ? {} : { skill: f.skill }),
      sources: f.source,
      ...(f.signals === undefined ? {} : { signalsFile: resolve(f.signals) }),
      offline: f.offline,
      api: githubApi(env),
      fetchText,
      repo: envOr(env, 'GITHUB_REPOSITORY', 'BrocksiNet/ai-skills-shopware'),
      ask: asker(root, f.agent, env, log),
      agent: f.agent,
      model: askModel(f.agent, env),
      maxClusters: envInt(env, 'SUGGEST_MAX_CLUSTERS', DEFAULT_MAX_CLUSTERS, 1),
      maxSignals: envInt(env, 'SUGGEST_MAX_SIGNALS', DEFAULT_MAX_SIGNALS, 1),
      supportedFrom: envOr(env, 'SUGGEST_SUPPORTED_FROM', '6.6.0.0'),
      apiIndex: apiIndexPath(f['api-index'], env),
      ...(baseline === undefined ? {} : { baseline }),
      log,
    });
    const files = writeSuggestions(resolve(f.out ?? join(root, SUGGESTIONS_DIR)), result);
    const n = result.counts;
    return (
      `${String(n.signals)} signal(s), ${String(n.clusters)} cluster(s), ${String(n.asked)} agent call(s) ` +
      `(${String(n.over_cap)} over the cap, ${String(n.agent_errors)} error(s)), ${String(n.proposals)} proposal(s), ` +
      `${String(n.passed)} passed the checks. Tokens: ${sumUsage(usageLog)}.\n${files.join('\n')}\n`
    );
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}
