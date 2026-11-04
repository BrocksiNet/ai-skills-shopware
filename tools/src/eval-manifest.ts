// A frozen plan makes missing tasks and results from another experiment visible.
import { type AbResult, trialStatusMatches } from './eval-results.ts';

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

export interface EvalManifest {
  version: 1;
  id: string;
  tasks: string[];
  repeats: number;
  agent: string;
  model: string;
  sha: string;
}

export function parseManifest(text: string): EvalManifest {
  const v: unknown = JSON.parse(text);
  if (
    !isRecord(v) ||
    v.version !== 1 ||
    typeof v.id !== 'string' ||
    v.id === '' ||
    !Array.isArray(v.tasks) ||
    v.tasks.length === 0 ||
    !v.tasks.every((t: unknown) => typeof t === 'string' && /^[a-z0-9-]+$/u.test(t)) ||
    new Set(v.tasks).size !== v.tasks.length ||
    typeof v.repeats !== 'number' ||
    !Number.isSafeInteger(v.repeats) ||
    v.repeats < 1 ||
    typeof v.agent !== 'string' ||
    typeof v.model !== 'string' ||
    typeof v.sha !== 'string'
  ) {
    throw new Error(
      'invalid eval manifest: expected version, id, unique tasks, positive repeats, agent, model and sha',
    );
  }
  const items: unknown[] = v.tasks;
  const tasks = items.filter((t): t is string => typeof t === 'string');
  return { version: 1, id: v.id, tasks, repeats: v.repeats, agent: v.agent, model: v.model, sha: v.sha };
}

/** Validate before deduplicating: a stale line must not be hidden by a later result. */
export function manifestErrors(results: AbResult[], expected: EvalManifest): string[] {
  const errors: string[] = [];
  const seen = new Set<string>();
  for (const r of results) {
    if (!expected.tasks.includes(r.task)) errors.push(`unexpected task: ${r.task}`);
    if (seen.has(r.task)) errors.push(`duplicate task: ${r.task}`);
    seen.add(r.task);
    for (const key of ['agent', 'model', 'sha', 'repeats'] as const) {
      if (r[key] !== expected[key]) errors.push(`${r.task}: ${key} does not match the manifest`);
    }
    if (r.experiment_id !== expected.id) errors.push(`${r.task}: experiment_id does not match the manifest`);
    if (r.trials === undefined || r.trials.length !== expected.repeats * 2) {
      errors.push(`${r.task}: missing trial records`);
    } else {
      for (const trial of r.trials) {
        if (!trialStatusMatches(trial)) errors.push(`${r.task}: ${trial.mode} trial status disagrees with exit_code`);
      }
      for (const mode of ['on', 'off'] as const) {
        const trials = r.trials.filter((t) => t.mode === mode);
        const ids = new Set(trials.map((t) => t.repeat));
        if (
          trials.length !== expected.repeats ||
          ids.size !== expected.repeats ||
          trials.some((t) => t.repeat < 1 || t.repeat > expected.repeats)
        ) {
          errors.push(`${r.task}: incomplete or duplicate ${mode} trials`);
        }
        const passed = trials.filter((t) => t.status === 'pass').length;
        const completed = trials.filter((t) => t.status === 'pass' || t.status === 'fail').length;
        if (r[mode] !== passed || (mode === 'on' ? r.on_done : r.off_done) !== completed) {
          errors.push(`${r.task}: ${mode} counts disagree with the trial records`);
        }
      }
    }
  }
  for (const task of expected.tasks) if (!seen.has(task)) errors.push(`missing task: ${task}`);
  return errors;
}
