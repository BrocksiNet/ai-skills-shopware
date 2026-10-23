// One cluster, one agent question (plan WP12 step 4): build the prompt,
// parse the answer against the schema and run the checks on each proposal.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Catalog } from './catalog.ts';
import type { Signal } from './signals.ts';
import { type Check, checkProposal, currentRuleText, inclusionCriteria, registryTopics } from './suggest-checks.ts';
import type { Cluster } from './suggest-cluster.ts';
import { buildPrompt } from './suggest-prompt.ts';
import { catalogIndex, relatedRules, type RuleIndex } from './suggest-related.ts';
import { parseAnswer, type Proposal } from './suggest-schema.ts';

export const MAX_PROPOSALS = 3;
/** Rules found by keyword match, on top of the cluster's mapped rules. */
export const MAX_RELATED = 8;

export type { Ask } from './agent-ask.ts';

export interface Suggestion extends Proposal {
  id: string;
  cluster: string;
  checks: Check[];
  ok: boolean;
  /** Some evidence comes from a private review source. */
  private: boolean;
}

/** What every question of a run shares. */
export interface AskContext {
  root: string;
  catalog: Catalog;
  topics: Map<string, string[]>;
  criteria: string;
  privateSources: Set<string>;
  trustOf: (s: Signal) => number;
  maxSignals: number;
  /** Every active rule, for the keyword match of unmapped signals. */
  index: RuleIndex;
}

export function askContext(
  root: string,
  catalog: Catalog,
  rest: Pick<AskContext, 'privateSources' | 'trustOf' | 'maxSignals'>,
): AskContext {
  return {
    root,
    catalog,
    topics: registryTopics(readFileSync(join(root, 'REGISTRY.md'), 'utf8')),
    criteria: inclusionCriteria(readFileSync(join(root, 'README.md'), 'utf8')),
    index: catalogIndex(root, catalog),
    ...rest,
  };
}

/** The prompt for a cluster; `retirement` is the evidence of a candidate. */
export function clusterPrompt(c: Cluster, x: AskContext, retirement?: string): string {
  const shown = c.signals.slice(0, x.maxSignals).map((w) => w.signal);
  return buildPrompt({
    cluster: c.key,
    ...(c.skill === undefined ? {} : { skill: c.skill }),
    criteria: x.criteria,
    topics: c.skill === undefined ? x.topics : new Map([[c.skill, x.topics.get(c.skill) ?? []]]),
    rules: c.rules.map((id) => ({
      id,
      title: x.catalog.rules.find((r) => r.id === id)?.title ?? '',
      text: currentRuleText(x.root, x.catalog, id),
    })),
    related: retirement === undefined ? relatedRules(x.index, shown, c.rules, MAX_RELATED) : [],
    signals: retirement === undefined ? shown.map((signal) => ({ signal, trust: x.trustOf(signal) })) : [],
    ...(retirement === undefined ? {} : { retirement: `${retirement} (evidence ID ${shown[0]?.url ?? ''})` }),
    maxProposals: retirement === undefined ? MAX_PROPOSALS : 1,
  });
}

export interface Answered {
  /** Proposals without their ID yet. */
  suggestions: Omit<Suggestion, 'id'>[];
  errors: string[];
}

/** Parses and checks an answer to `clusterPrompt`. */
export function checkAnswer(c: Cluster, x: AskContext, text: string): Answered {
  const shown = c.signals.slice(0, x.maxSignals).map((w) => w.signal);
  const byUrl = new Map(shown.map((s) => [s.url, s]));
  const parsed = parseAnswer(text, MAX_PROPOSALS);
  const suggestions = parsed.proposals.map((p) => {
    const checks = checkProposal(p, { catalog: x.catalog, topics: x.topics, shown });
    return {
      ...p,
      cluster: c.key,
      checks,
      ok: checks.every((k) => k.ok),
      private: p.evidence.some((u) => x.privateSources.has(byUrl.get(u)?.source ?? '')),
    };
  });
  return { suggestions, errors: parsed.errors.map((e) => `${c.key}: ${e}`) };
}
