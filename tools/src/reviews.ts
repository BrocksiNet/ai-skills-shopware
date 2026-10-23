// Review collector (plan WP12 step 3): the review comments and review bodies
// of PRs merged into a review source's base branch, as signals. Pure parsing
// plus one GraphQL search per week of the window and page of 25 PRs.
//
// Kept: thread starters and review bodies of at least MIN_TEXT characters
// once suggestion blocks and HTML comments are gone, by anyone but bots and
// the PR's author. Who to trust is decided later from each reviewer's
// history (review-store.ts), not here: membership alone says little.
import type { GitHubGraphql } from './github.ts';
import { inSeries } from './series.ts';
import type { Signal } from './signals.ts';
import type { ReviewSource } from './sources.ts';

/** Shorter than this, a comment is a typo fix or a "nit". Phase 0 threshold. */
export const MIN_TEXT = 40;
/** Diff lines kept per comment: the end of the hunk, where the comment sits. */
export const HUNK_LINES = 30;
/** GitHub search returns at most 1000 results per query. */
const SEARCH_LIMIT = 1000;
const PAGE = 25;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export const REVIEW_QUERY = `query($q: String!, $after: String) {
  search(type: ISSUE, query: $q, first: ${PAGE}, after: $after) {
    issueCount
    pageInfo { hasNextPage endCursor }
    nodes {
      ... on PullRequest {
        number title url mergedAt
        author { login }
        reviewThreads(first: 100) {
          nodes {
            isOutdated path
            comments(first: 1) {
              totalCount
              nodes {
                databaseId url body createdAt diffHunk authorAssociation
                author { login kind: __typename }
                pullRequestReview { state }
              }
            }
          }
        }
        reviews(first: 100) {
          nodes { databaseId url body state submittedAt authorAssociation author { login kind: __typename } }
        }
      }
    }
  }
}`;

type Json = Record<string, unknown>;
const isRecord = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v);
const str = (v: unknown): string => (typeof v === 'string' ? v : '');
const num = (v: unknown): number => (typeof v === 'number' ? v : 0);
const list = (v: unknown, key = 'nodes'): unknown[] => {
  const nodes = isRecord(v) ? v[key] : undefined;
  return Array.isArray(nodes) ? nodes : [];
};

/** Comment text without suggestion blocks and HTML comments. */
export function cleanText(body: string): string {
  return body
    .replaceAll(/```suggestion[\s\S]*?```/gu, '')
    .replaceAll(/<!--[\s\S]*?-->/gu, '')
    .trim();
}

/** The added and removed lines at the end of a diff hunk, without the
 *  +/- prefix: what the route anchors run on. */
export function hunkLines(hunk: string): string[] {
  return hunk
    .split('\n')
    .filter((l) => l.startsWith('+') || l.startsWith('-'))
    .map((l) => l.slice(1))
    .slice(-HUNK_LINES);
}

interface Author {
  login: string;
  bot: boolean;
}

function author(v: unknown): Author {
  if (!isRecord(v)) return { login: '', bot: true };
  const login = str(v.login);
  return { login, bot: login === '' || v.kind === 'Bot' || login.endsWith('[bot]') };
}

interface PrContext {
  source: ReviewSource;
  prAuthor: string;
  base: Pick<Signal, 'source' | 'repo' | 'pr' | 'map'>;
  number: number;
}

const signalId = (c: PrContext, kind: string, dbId: unknown): string =>
  `${c.source.repo}#${c.number}/${kind}/${num(dbId)}`;
const kept = (c: PrContext, a: Author, text: string): boolean =>
  !a.bot && a.login !== c.prAuthor && text.length >= MIN_TEXT;

/** A review thread as one signal: its first comment, with the reply count. */
function threadSignal(c: PrContext, thread: unknown): Signal[] {
  if (!isRecord(thread) || !isRecord(thread.comments)) return [];
  const [first] = list(thread.comments);
  if (!isRecord(first)) return [];
  const a = author(first.author);
  const text = cleanText(str(first.body));
  if (!kept(c, a, text)) return [];
  const state = isRecord(first.pullRequestReview) ? str(first.pullRequestReview.state) : '';
  return [
    {
      ...c.base,
      id: signalId(c, 'review-comment', first.databaseId),
      kind: 'review-comment',
      url: str(first.url),
      date: str(first.createdAt),
      path: str(thread.path),
      text,
      lines: hunkLines(str(first.diffHunk)),
      author: { login: a.login, association: str(first.authorAssociation) },
      thread: { replies: Math.max(0, num(thread.comments.totalCount) - 1), outdated: thread.isOutdated === true },
      ...(state === '' ? {} : { review: { state } }),
    },
  ];
}

function bodySignal(c: PrContext, review: unknown): Signal[] {
  if (!isRecord(review)) return [];
  const a = author(review.author);
  const text = cleanText(str(review.body));
  if (!kept(c, a, text)) return [];
  return [
    {
      ...c.base,
      id: signalId(c, 'review', review.databaseId),
      kind: 'review-body',
      url: str(review.url),
      date: str(review.submittedAt),
      path: '',
      text,
      lines: [],
      author: { login: a.login, association: str(review.authorAssociation) },
      review: { state: str(review.state) },
    },
  ];
}

/** The signals of one PR node from REVIEW_QUERY. */
export function prSignals(source: ReviewSource, node: unknown): Signal[] {
  if (!isRecord(node) || typeof node.number !== 'number') return [];
  const pr = { number: node.number, title: str(node.title), merged_at: str(node.mergedAt) };
  const c: PrContext = {
    source,
    prAuthor: author(node.author).login,
    base: { source: source.id, repo: source.repo, pr, map: [] },
    number: node.number,
  };
  return [
    ...list(node.reviewThreads).flatMap((t) => threadSignal(c, t)),
    ...list(node.reviews).flatMap((r) => bodySignal(c, r)),
  ];
}

const iso = (ms: number): string => new Date(ms).toISOString().replace(/\.[0-9]{3}Z$/u, 'Z');

/** `[from, to]` cut into pieces of at most a week, so no search hits the
 *  1000-result cap on a backfill. */
export function weeks(from: string, to: string): { from: string; to: string }[] {
  const start = Date.parse(from);
  const end = Date.parse(to);
  if (Number.isNaN(start) || Number.isNaN(end)) throw new Error(`invalid window ${from}..${to}`);
  const pieces: { from: string; to: string }[] = [];
  for (let t = start; t <= end; t += WEEK_MS) pieces.push({ from: iso(t), to: iso(Math.min(t + WEEK_MS, end)) });
  return pieces;
}

export const searchQuery = (source: ReviewSource, from: string, to: string): string =>
  `repo:${source.repo} is:pr is:merged base:${source.base} merged:${from}..${to}`;

export interface Collected {
  signals: Signal[];
  prs: number;
  queries: number;
}

interface Page {
  nodes: unknown[];
  queries: number;
}

/** One search, every page: each page needs the previous page's cursor. */
async function searchPages(gql: GitHubGraphql, q: string, after: string | null = null): Promise<Page> {
  const data = await gql(REVIEW_QUERY, { q, after });
  const search = isRecord(data) ? data.search : undefined;
  if (!isRecord(search) || !isRecord(search.pageInfo)) throw new Error('GitHub GraphQL: no search result');
  if (num(search.issueCount) > SEARCH_LIMIT) throw new Error(`more than ${SEARCH_LIMIT} PRs for ${q}`);
  const nodes = list(search);
  if (search.pageInfo.hasNextPage !== true) return { nodes, queries: 1 };
  const rest = await searchPages(gql, q, str(search.pageInfo.endCursor));
  return { nodes: [...nodes, ...rest.nodes], queries: rest.queries + 1 };
}

/** Every PR of the window. PRs on a week boundary come back twice and
 *  count once. */
export async function collectReviews(
  gql: GitHubGraphql,
  source: ReviewSource,
  window: { from: string; to: string },
): Promise<Collected> {
  const pages = await inSeries(weeks(window.from, window.to), (w) =>
    searchPages(gql, searchQuery(source, w.from, w.to)),
  );
  const prs = new Map<number, unknown>();
  for (const node of pages.flatMap((p) => p.nodes)) {
    if (isRecord(node) && typeof node.number === 'number') prs.set(node.number, node);
  }
  const signals = [...prs.values()].flatMap((node) => prSignals(source, node));
  return { signals, prs: prs.size, queries: pages.reduce((n, p) => n + p.queries, 0) };
}
