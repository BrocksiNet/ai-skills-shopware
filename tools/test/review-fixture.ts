// Shared by the review collector tests (plan WP12 step 3). The GitHub
// GraphQL API is stubbed: `prs-19917-20855.json` is the search answer for the
// two PRs behind REV-034 and REV-035, recorded 2026-10-23, with long diff
// hunks and bot comments cut.
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { loadCatalog } from '../src/catalog.ts';
import { mapIndex, mapSignals } from '../src/map-signal.ts';
import { prSignals } from '../src/reviews.ts';
import type { Signal } from '../src/signals.ts';
import { loadReviewSources, loadSources, type ReviewSource } from '../src/sources.ts';

export const ROOT = resolve(import.meta.dirname, '../..');
export const INDEX = mapIndex(ROOT, loadCatalog(ROOT), loadSources(ROOT));
export const CORE: ReviewSource =
  loadReviewSources(ROOT).find((s) => s.id === 'core-reviews') ?? assert.fail('no core-reviews source');
const RECORDED: unknown = JSON.parse(
  readFileSync(join(import.meta.dirname, 'fixtures/reviews/prs-19917-20855.json'), 'utf8'),
);

export const recordedNodes = (): unknown[] => {
  const search = typeof RECORDED === 'object' && RECORDED !== null && 'search' in RECORDED ? RECORDED.search : {};
  return typeof search === 'object' && search !== null && 'nodes' in search && Array.isArray(search.nodes)
    ? search.nodes
    : [];
};

/** The recorded PRs' signals, mapped with today's rules. */
export const SIGNALS: Signal[] = mapSignals(
  recordedNodes().flatMap((n) => prSignals(CORE, n)),
  INDEX,
);

export const tmp = (): string => mkdtempSync(join(tmpdir(), 'review-signals-'));

/** The signal of a PR whose text starts with `start`. */
export const of = (pr: number, start: string): Signal =>
  SIGNALS.find((s) => s.pr?.number === pr && s.text.startsWith(start)) ?? assert.fail(`#${pr}: ${start}`);

/** A search answer with the given PR nodes on one page. */
export const page = (nodes: unknown[], next: string | null = null, issueCount = nodes.length): unknown => ({
  search: { issueCount, pageInfo: { hasNextPage: next !== null, endCursor: next }, nodes },
});
