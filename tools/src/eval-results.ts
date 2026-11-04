// A/B result records written by evals/runner/ab.sh, one JSON object per
// line (plan WP1, WP10). Field reference: evals/README.md.

import { compareText } from './text.ts';

export const VERDICTS = ['improved', 'held', 'no_difference', 'worse', 'error'] as const;
export type Verdict = (typeof VERDICTS)[number];

/** Average tokens per completed run of one mode. */
export interface Tokens {
  input: number;
  output: number;
  runs: number;
}

export interface AbTrial {
  mode: 'on' | 'off';
  repeat: number;
  status: 'pass' | 'fail' | 'error' | 'skipped';
  exit_code: number;
  duration_ms: number;
  skills: string[] | null;
  tokens: Tokens | null;
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
  verdict: Verdict;
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
  experiment_id?: string;
  run_id?: string;
  artifacts?: string;
  task_hash?: string;
  skills_hash?: string;
  grader_hash?: string;
  trials?: AbTrial[];
}

type Json = Record<string, unknown>;
type Check = (v: unknown) => boolean;

const isRecord = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v);
export const isNumber = (v: unknown): v is number => typeof v === 'number';
const isString = (v: unknown): v is string => typeof v === 'string';
const isCount = (v: unknown): v is number => Number.isInteger(v) && Number(v) >= 0;
const isInteger = (v: unknown): v is number => Number.isInteger(v);
const isVerdict = (v: unknown): v is Verdict => VERDICTS.some((verdict) => verdict === v);
export const hasTokens = (t: unknown): t is Tokens =>
  isRecord(t) && isCount(t.input) && isCount(t.output) && isCount(t.runs);
const optional =
  (check: Check): Check =>
  (v) =>
    v === undefined || check(v);
const nullable =
  (check: Check): Check =>
  (v) =>
    v === undefined || v === null || check(v);

/** A graded outcome uses 0/1; infrastructure and skipped runs never do. */
export const trialStatusMatches = (t: Pick<AbTrial, 'status' | 'exit_code'>): boolean =>
  Number.isSafeInteger(t.exit_code) &&
  (t.status === 'pass' ? t.exit_code === 0 : t.status === 'fail' ? t.exit_code === 1 : t.exit_code > 1);

const isTrialStatus = (v: unknown): v is AbTrial['status'] =>
  v === 'pass' || v === 'fail' || v === 'error' || v === 'skipped';

const isTrial = (v: unknown): v is AbTrial =>
  isRecord(v) &&
  (v.mode === 'on' || v.mode === 'off') &&
  isCount(v.repeat) &&
  isTrialStatus(v.status) &&
  isCount(v.exit_code) &&
  trialStatusMatches({ status: v.status, exit_code: v.exit_code }) &&
  isCount(v.duration_ms) &&
  (v.skills === null || (Array.isArray(v.skills) && v.skills.every((s: unknown) => isString(s)))) &&
  (v.tokens === null || hasTokens(v.tokens));
const areTrials = (v: unknown): boolean => Array.isArray(v) && v.every((t: unknown) => isTrial(t));

/** The type of every record field; the record type is checked against it. */
const FIELDS = {
  task: isString,
  repeats: isCount,
  on: isCount,
  off: isCount,
  on_done: optional(isCount),
  off_done: optional(isCount),
  errors: optional(isCount),
  delta: optional(isInteger),
  verdict: isVerdict,
  loaded_on: nullable(isCount),
  loaded_off: nullable(isCount),
  tokens_on: nullable(hasTokens),
  tokens_off: nullable(hasTokens),
  agent: optional(isString),
  model: optional(isString),
  sha: optional(isString),
  ts: optional(isString),
  experiment_id: optional(isString),
  run_id: optional(isString),
  artifacts: optional(isString),
  task_hash: optional(isString),
  skills_hash: optional(isString),
  grader_hash: optional(isString),
  trials: optional(areTrials),
} as const satisfies Record<keyof AbResult, Check>;

/** The first field of `v` that is missing or has the wrong type. */
function badField(v: Json): string | undefined {
  return Object.entries(FIELDS).find(([key, check]) => !check(v[key]))?.[0];
}

const isAbResult = (v: Json): v is Json & AbResult => badField(v) === undefined;

/** Every A/B record in JSONL text. Blank lines are skipped and JSON values
 *  that are not objects with a `task` are ignored. A line that is not JSON,
 *  or a record with a missing or mistyped field, throws, so a corrupt results
 *  file never passes a gate. */
export function parseResults(text: string): AbResult[] {
  const out: AbResult[] = [];
  for (const [i, line] of text.split('\n').entries()) {
    if (line.trim() === '') continue;
    let value: unknown;
    try {
      value = JSON.parse(line);
    } catch {
      throw new Error(`line ${i + 1} is not JSON: ${line.slice(0, 80)}`);
    }
    if (!isRecord(value) || !('task' in value)) continue;
    if (!isAbResult(value)) throw new Error(`line ${i + 1}: field '${badField(value) ?? ''}' is missing or mistyped`);
    out.push(value);
  }
  return out;
}

/** One record per task, sorted by task name. When a task appears more than
 *  once, the last line wins, so a rerun replaces the earlier result. */
export function latestPerTask(results: AbResult[]): AbResult[] {
  const byTask = new Map<string, AbResult>();
  for (const r of results) byTask.set(r.task, r);
  return [...byTask.values()].toSorted((a, b) => compareText(a.task, b.task));
}

export const onDone = (r: AbResult): number => r.on_done ?? r.repeats;
export const offDone = (r: AbResult): number => r.off_done ?? r.repeats;

/** Integer percentage, truncated like shell arithmetic. */
export const pct = (part: number, whole: number): number => Math.trunc((part * 100) / whole);
