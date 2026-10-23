// `suggest-rules` (plan WP12 step 4): load signals, cluster them without a
// model, ask the agent once per cluster (capped by SUGGEST_MAX_CLUSTERS),
// check every answer without a model, rank the proposals, and return what
// `suggestions/<date>.md` and `.json` (git-ignored) show. Retirement
// candidates come from deterministic evidence and are asked first. A run
// can continue an earlier one (`--continue`): it asks only the clusters
// that run did not, and the result holds both.
import { existsSync, readFileSync } from 'node:fs';
import { type Catalog, loadCatalog } from './catalog.ts';
import { inSeries } from './series.ts';
import type { Signal } from './signals.ts';
import { loadReviewSources } from './sources.ts';
import {
  type Ask,
  type AskContext,
  askContext,
  checkAnswer,
  clusterPrompt,
  isSuggestion,
  type Suggestion,
} from './suggest-ask.ts';
import { type Cluster, cluster, forSkill } from './suggest-cluster.ts';
import { type LoadOptions, loadInput, signalTrust } from './suggest-load.ts';
import { rankSuggestions, skillContexts } from './suggest-rank.ts';
import { type RetireCandidate, type RetireOptions, retirementCluster, retirements } from './suggest-retire.ts';

export const SUGGESTIONS_DIR = 'suggestions';
export const DEFAULT_MAX_CLUSTERS = 20;
export const DEFAULT_MAX_SIGNALS = 25;

export interface SuggestOptions extends LoadOptions, RetireOptions {
  now: Date;
  skill?: string;
  ask: Ask;
  agent: string;
  model: string;
  maxClusters: number;
  maxSignals: number;
  /** An earlier run to continue: its clusters are not asked again. */
  previous?: SuggestResult;
}

export interface ClusterSummary {
  key: string;
  signals: number;
  prs: number;
  score: number;
  rules: string[];
}

export interface SuggestResult {
  generated: string;
  window: { since: string; until: string };
  agent: string;
  model: string;
  inputs: string[];
  counts: {
    signals: number;
    mapped: number;
    clusters: number;
    dropped_single: number;
    asked: number;
    over_cap: number;
    agent_errors: number;
    proposals: number;
    passed: number;
  };
  suggestions: Suggestion[];
  retirements: RetireCandidate[];
  /** Clusters asked about, then those the cap left out. */
  asked: ClusterSummary[];
  skipped: ClusterSummary[];
  errors: string[];
}

const prOf = (s: Signal): string => (s.pr === undefined ? s.url : `${s.repo}#${String(s.pr.number)}`);

const summary = (c: Cluster): ClusterSummary => ({
  key: c.key,
  signals: c.signals.length,
  prs: new Set(c.signals.map((w) => prOf(w.signal))).size,
  score: c.score,
  rules: c.rules,
});

interface Queued {
  c: Cluster;
  retire?: RetireCandidate;
}

/** One question per queued cluster, one after another. Suggestion IDs are
 *  `<date>-NN` in the order of the answers, from `first` on. */
async function askAll(
  o: SuggestOptions,
  asked: Queued[],
  x: AskContext,
  errors: string[],
  first: number,
): Promise<{ suggestions: Suggestion[]; agentErrors: number }> {
  const day = o.now.toISOString().slice(0, 10);
  const suggestions: Suggestion[] = [];
  let agentErrors = 0;
  await inSeries(asked, async ({ c, retire }, i) => {
    o.log(`[${String(i + 1)}/${String(asked.length)}] ${c.key}\n`);
    const answer = await o.ask(clusterPrompt(c, x, retire?.evidence));
    if (answer.status !== 0) {
      agentErrors += 1;
      errors.push(`${c.key}: agent error (exit ${String(answer.status)})`);
      return;
    }
    const checked = checkAnswer(c, x, answer.text);
    errors.push(...checked.errors);
    for (const s of checked.suggestions)
      suggestions.push({ ...s, id: `${day}-${String(first + suggestions.length).padStart(2, '0')}` });
  });
  return { suggestions, agentErrors };
}

type Json = Record<string, unknown>;
const isRecord = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v);
const isStrings = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === 'string');

const isSummary = (v: unknown): v is ClusterSummary =>
  isRecord(v) &&
  typeof v.key === 'string' &&
  typeof v.signals === 'number' &&
  typeof v.prs === 'number' &&
  typeof v.score === 'number' &&
  isStrings(v.rules);

/** An earlier `suggestions/<date>.json`, checked field by field. */
export function readResult(file: string): SuggestResult {
  if (!existsSync(file)) throw new Error(`${file} not found`);
  const v: unknown = JSON.parse(readFileSync(file, 'utf8'));
  if (
    !isRecord(v) ||
    !isRecord(v.window) ||
    !isRecord(v.counts) ||
    !Array.isArray(v.suggestions) ||
    !v.suggestions.every((s) => isSuggestion(s)) ||
    !Array.isArray(v.asked) ||
    !v.asked.every((c) => isSummary(c)) ||
    !Array.isArray(v.retirements) ||
    !isStrings(v.inputs) ||
    !isStrings(v.errors) ||
    typeof v.generated !== 'string'
  )
    throw new Error(`${file} is not a suggest-rules result`);
  return {
    generated: v.generated,
    window: { since: String(v.window.since), until: String(v.window.until) },
    agent: String(v.agent),
    model: String(v.model),
    inputs: v.inputs,
    counts: {
      signals: Number(v.counts.signals),
      mapped: Number(v.counts.mapped),
      clusters: Number(v.counts.clusters),
      dropped_single: Number(v.counts.dropped_single),
      asked: Number(v.counts.asked),
      over_cap: Number(v.counts.over_cap),
      agent_errors: Number(v.counts.agent_errors),
      proposals: Number(v.counts.proposals),
      passed: Number(v.counts.passed),
    },
    suggestions: v.suggestions,
    retirements: [],
    asked: v.asked,
    skipped: [],
    errors: v.errors,
  };
}

/** The number after the last `<day>-NN` ID of the earlier run. */
function nextNumber(previous: SuggestResult | undefined, day: string): number {
  const used = (previous?.suggestions ?? []).flatMap((s) =>
    s.id.startsWith(`${day}-`) ? [Number(s.id.slice(day.length + 1))] : [],
  );
  return Math.max(0, ...used) + 1;
}

function rankAll(
  root: string,
  catalog: Catalog,
  signals: Signal[],
  trustOf: (s: Signal) => number,
  all: Suggestion[],
): Suggestion[] {
  return rankSuggestions(all, {
    catalog,
    signals: new Map(signals.map((s) => [s.url, s])),
    trustOf,
    contexts: skillContexts(
      root,
      all.map((s) => s.skill),
    ),
  });
}

/** Retirements first, then the clusters; without those an earlier run asked. */
function queueOf(retire: RetireCandidate[], clusters: Cluster[], previous: SuggestResult | undefined): Queued[] {
  const done = new Set((previous?.asked ?? []).map((c) => c.key));
  return [...retire.map((r) => ({ c: retirementCluster(r), retire: r })), ...clusters.map((c) => ({ c }))].filter(
    (q) => !done.has(q.c.key),
  );
}

export async function suggest(o: SuggestOptions): Promise<SuggestResult> {
  const catalog = loadCatalog(o.root);
  const errors: string[] = [];
  const { signals, inputs, trust } = await loadInput(o, catalog);
  const trustOf = (s: Signal): number => signalTrust(s, trust);
  const { clusters, dropped } = cluster(signals, trustOf);
  const mine = forSkill(clusters, o.skill);
  const retire = retirements(o, catalog, errors);
  const queue = queueOf(retire, mine, o.previous);
  const asked = queue.slice(0, o.maxClusters);
  const skipped = queue.slice(o.maxClusters).map((q) => q.c);
  const privateSources = new Set(loadReviewSources(o.root).flatMap((r) => (r.private ? [r.id] : [])));
  const x = askContext(o.root, catalog, { privateSources, trustOf, maxSignals: o.maxSignals });
  const day = o.now.toISOString().slice(0, 10);
  const fresh = await askAll(o, asked, x, errors, nextNumber(o.previous, day));
  const p = o.previous;
  const all = [...(p?.suggestions ?? []), ...fresh.suggestions];
  const suggestions = rankAll(o.root, catalog, signals, trustOf, all);
  const passed = suggestions.filter((s) => s.ok).length;
  const askedSummaries = [...(p?.asked ?? []), ...asked.map((q) => summary(q.c))];
  const errorsAll = [...(p?.errors ?? []), ...errors];
  return {
    generated: o.now.toISOString().replace(/\.[0-9]{3}Z$/u, 'Z'),
    window: { since: o.since, until: o.until },
    agent: o.agent,
    model: o.model,
    inputs: [...new Set([...(p?.inputs ?? []), ...inputs])],
    counts: {
      signals: signals.length,
      mapped: signals.filter((s) => s.map.length > 0).length,
      clusters: mine.length,
      dropped_single: dropped.length,
      asked: askedSummaries.length,
      over_cap: skipped.length,
      agent_errors: (p?.counts.agent_errors ?? 0) + fresh.agentErrors,
      proposals: suggestions.length,
      passed,
    },
    suggestions,
    retirements: retire,
    asked: askedSummaries,
    skipped: skipped.map((c) => summary(c)),
    errors: errorsAll,
  };
}
