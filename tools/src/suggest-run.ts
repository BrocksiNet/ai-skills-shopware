// `suggest-rules` (plan WP12 step 4): load signals, cluster them without a
// model, ask the agent once per cluster (capped by SUGGEST_MAX_CLUSTERS),
// check every answer without a model, and return what
// `suggestions/<date>.md` and `.json` (git-ignored) show. Retirement
// candidates come from deterministic evidence and are asked first.
import { loadCatalog } from './catalog.ts';
import { inSeries } from './series.ts';
import type { Signal } from './signals.ts';
import { loadReviewSources } from './sources.ts';
import { type Ask, type AskContext, askContext, checkAnswer, clusterPrompt, type Suggestion } from './suggest-ask.ts';
import { type Cluster, cluster, forSkill } from './suggest-cluster.ts';
import { type LoadOptions, loadInput, signalTrust } from './suggest-load.ts';
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
 *  `<date>-NN` in the order of the answers. */
async function askAll(
  o: SuggestOptions,
  asked: Queued[],
  x: AskContext,
  errors: string[],
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
      suggestions.push({ ...s, id: `${day}-${String(suggestions.length + 1).padStart(2, '0')}` });
  });
  return { suggestions, agentErrors };
}

export async function suggest(o: SuggestOptions): Promise<SuggestResult> {
  const catalog = loadCatalog(o.root);
  const errors: string[] = [];
  const { signals, inputs, trust } = await loadInput(o, catalog);
  const trustOf = (s: Signal): number => signalTrust(s, trust);
  const { clusters, dropped } = cluster(signals, trustOf);
  const mine = forSkill(clusters, o.skill);
  const retire = retirements(o, catalog, errors);
  const queue: Queued[] = [...retire.map((r) => ({ c: retirementCluster(r), retire: r })), ...mine.map((c) => ({ c }))];
  const asked = queue.slice(0, o.maxClusters);
  const skipped = queue.slice(o.maxClusters).map((q) => q.c);
  const privateSources = new Set(loadReviewSources(o.root).flatMap((r) => (r.private ? [r.id] : [])));
  const x = askContext(o.root, catalog, { privateSources, trustOf, maxSignals: o.maxSignals });
  const { suggestions, agentErrors } = await askAll(o, asked, x, errors);
  const passed = suggestions.filter((s) => s.ok).length;
  return {
    generated: o.now.toISOString().replace(/\.[0-9]{3}Z$/u, 'Z'),
    window: { since: o.since, until: o.until },
    agent: o.agent,
    model: o.model,
    inputs,
    counts: {
      signals: signals.length,
      mapped: signals.filter((s) => s.map.length > 0).length,
      clusters: mine.length,
      dropped_single: dropped.length,
      asked: asked.length,
      over_cap: skipped.length,
      agent_errors: agentErrors,
      proposals: suggestions.length,
      passed,
    },
    suggestions,
    retirements: retire,
    asked: asked.map((q) => summary(q.c)),
    skipped: skipped.map((c) => summary(c)),
    errors,
  };
}
