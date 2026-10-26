// Shared fixtures of the suggest-rules tests: review signals, proposals and
// catalog rules built from a few fields, and a scratch folder per test file.
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { after } from 'node:test';
import { type Catalog, loadCatalog, type Rule } from '../src/catalog.ts';
import type { AbResult } from '../src/eval-results.ts';
import type { Signal } from '../src/signals.ts';
import type { Proposal } from '../src/suggest-schema.ts';

export const ROOT = resolve(import.meta.dirname, '../..');
/** The repository's real catalog. */
export const realCatalog = (): Catalog => loadCatalog(ROOT);
export const FAKE = join(ROOT, 'evals/runner/fake-agent.sh');

/** A scratch folder, removed after the test file. */
export function scratch(): string {
  const dir = mkdtempSync(join(tmpdir(), 'suggest-rules-test-'));
  after(() => {
    rmSync(dir, { recursive: true, force: true });
  });
  return dir;
}

export type SignalFields = Omit<Partial<Signal>, 'pr'> & { pr?: number; state?: string; outdated?: boolean };

let n = 0;
/** A review comment on a merged core PR. URLs are unique per call. */
export function signal(fields: SignalFields): Signal {
  n += 1;
  const { state, outdated, pr = 100, ...rest } = fields;
  return {
    id: `shopware/shopware#${String(pr)}/review-comment/${String(n)}`,
    source: 'core-reviews',
    kind: 'review-comment',
    repo: 'shopware/shopware',
    url: `https://github.com/shopware/shopware/pull/${String(pr)}#discussion_r${String(n)}`,
    date: '2026-10-01T10:00:00Z',
    path: 'src/Core/Fake/Thing.php',
    text: 'A review comment about the code.',
    author: { login: 'reviewer', association: 'MEMBER' },
    thread: { replies: 0, outdated: outdated ?? false },
    ...(state === undefined ? {} : { review: { state } }),
    map: [],
    ...rest,
    pr: { number: pr, title: 'A PR', merged_at: '2026-10-02T10:00:00Z' },
  };
}

export const proposal = (fields: Partial<Proposal>): Proposal => ({
  action: 'new',
  skill: 'sw-review-learnings',
  rule: '',
  title: 'A rule',
  evidence: [],
  criteria: { delta: 'd', frequency: 'f', single_home: 's', testable: 't' },
  draft: 'Rule text.',
  eval: { kind: 'review-pair', catch: 'c', ignore: 'i' },
  ...fields,
});

export const rule = (id: string, fields: Partial<Rule>): Rule => ({
  id,
  skill: 'sw-testing',
  file: 'skills/sw-testing/SKILL.md',
  title: id,
  status: 'active',
  since: '1.0.0',
  eval: null,
  core_guide_ids: [],
  audience: ['core'],
  defer_on_trunk: false,
  ...fields,
});

export const abResult = (task: string, off: number, ts: string): AbResult => ({
  task,
  repeats: 3,
  on: 3,
  off,
  verdict: 'no_difference',
  ts,
});
