// A/B result records written by evals/runner/ab.sh, one JSON object per
// line (plan WP1, WP10). Field reference: evals/README.md.

export const VERDICTS = ['improved', 'held', 'no_difference', 'worse', 'error'] as const;
export type Verdict = (typeof VERDICTS)[number];

/** Average tokens per completed run of one mode. */
export interface Tokens {
  input: number;
  output: number;
  runs: number;
}

export interface AbResult {
  task: string;
  repeats: number;
  /** Passed runs with the skill on / off. */
  on: number;
  off: number;
  /** Completed runs (no agent error). Missing on lines older than WP1. */
  on_done?: number;
  off_done?: number;
  errors?: number;
  delta?: number;
  verdict: Verdict | string;
  /** null when the adapter does not report skill loads. */
  loaded_on?: number | null;
  loaded_off?: number | null;
  /** null when the adapter does not report tokens; missing on older lines. */
  tokens_on?: Tokens | null;
  tokens_off?: Tokens | null;
  agent?: string;
  model?: string;
  sha?: string;
  ts?: string;
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Every A/B record in JSONL text. Blank lines are skipped and JSON values
 *  that are not objects with a `task` are ignored; a line that is not JSON
 *  throws, so a corrupt results file never passes a gate. */
export function parseResults(text: string): AbResult[] {
  const out: AbResult[] = [];
  text.split('\n').forEach((line, i) => {
    if (line.trim() === '') return;
    let value: unknown;
    try {
      value = JSON.parse(line);
    } catch {
      throw new Error(`line ${i + 1} is not JSON: ${line.slice(0, 80)}`);
    }
    if (isRecord(value) && 'task' in value) out.push(value as unknown as AbResult);
  });
  return out;
}

/** One record per task, sorted by task name. When a task appears more than
 *  once, the last line wins, so a rerun replaces the earlier result. */
export function latestPerTask(results: AbResult[]): AbResult[] {
  const byTask = new Map<string, AbResult>();
  for (const r of results) byTask.set(r.task, r);
  return [...byTask.keys()].sort(compareText).map((t) => byTask.get(t)!);
}

/** Byte order, like jq's sort and `LC_ALL=C sort`. */
export function compareText(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export const onDone = (r: AbResult): number => r.on_done ?? r.repeats;
export const offDone = (r: AbResult): number => r.off_done ?? r.repeats;
export const isNumber = (v: unknown): v is number => typeof v === 'number';
export const hasTokens = (t: Tokens | null | undefined): t is Tokens => isRecord(t);

/** Integer percentage, truncated like shell arithmetic. */
export const pct = (part: number, whole: number): number => Math.trunc((part * 100) / whole);

/** A non-negative integer from the environment, or the default. */
export function envInt(env: NodeJS.ProcessEnv, name: string, fallback: number, min = 0): number {
  const raw = env[name];
  if (raw === undefined || raw === '') return fallback;
  if (!/^[0-9]+$/.test(raw) || Number(raw) < min) {
    throw new Error(`${name} must be ${min > 0 ? `>= ${min}` : 'a number'}`);
  }
  return Number(raw);
}
