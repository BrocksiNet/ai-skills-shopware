// The model profiles of one eval run: which agent CLI runs which model.
// evals.yml fans its A/B shards, gates and baselines out per profile, so
// each model gets its own verdict. A rule is only retired when no profile
// shows an effect.

import { DEFAULT_MODELS } from './adapters.ts';
import { envOr } from './env.ts';

export interface EvalProfile {
  /** Unique per run; names artifacts, gate jobs and baseline files. */
  id: string;
  agent: string;
  model: string;
}

/** The profiles for a comma-separated agent list and an optional model, or
 *  an error message. A model only applies when one agent runs. */
export function evalProfiles(agents: string, model: string): EvalProfile[] | string {
  const names = [
    ...new Set(
      agents
        .split(',')
        .map((a) => a.trim())
        .filter((a) => a !== ''),
    ),
  ];
  if (names.length === 0) names.push('opencode');
  const unknown = names.filter((a) => DEFAULT_MODELS[a] === undefined);
  if (unknown.length > 0)
    return `unknown agent(s): ${unknown.join(', ')} (known: ${Object.keys(DEFAULT_MODELS).join(', ')})`;
  if (model !== '' && names.length > 1) return 'a model can only be set for a single agent';
  return names.map((agent) => ({ id: agent, agent, model: model === '' ? (DEFAULT_MODELS[agent] ?? '') : model }));
}

export const evalProfilesFromEnv = (env: NodeJS.ProcessEnv): EvalProfile[] | string =>
  evalProfiles(envOr(env, 'EVAL_AGENTS', 'opencode'), envOr(env, 'EVAL_MODEL', ''));
