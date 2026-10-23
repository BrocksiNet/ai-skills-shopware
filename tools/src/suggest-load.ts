// Input of `suggest-rules` (plan WP12 step 4): the review signals of a
// window from the `review-signals` release (downloaded into the git-ignored
// cache, which also holds private sources collected locally), the open
// drift issue, or a signals file. Everything is mapped again with today's
// rules, so a route added after the collector ran still counts.
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { allPages, type GitHubApi } from './github.ts';
import type { Catalog } from './catalog.ts';
import { type MapIndex, mapIndex, mapSignals } from './map-signal.ts';
import { ISSUE_LABEL } from './mine-issue.ts';
import { CACHE_DIR, RELEASE, readStore, REVIEWERS_FILE, reviewers, trust } from './review-store.ts';
import { inSeries } from './series.ts';
import { parseSignals, type Signal, type SignalKind, type SignalMap } from './signals.ts';
import { loadSources } from './sources.ts';

const DAY_MS = 24 * 60 * 60 * 1000;
const ASSET = /^([a-z0-9-]+)-([0-9]{4}-[0-9]{2})\.jsonl$/u;

/** `YYYY-MM-DD`, or `Nd` for N days before `now`. */
export function parseSince(value: string, now: Date): string {
  const days = /^([0-9]+)d$/u.exec(value)?.[1];
  if (days !== undefined) return new Date(now.getTime() - Number(days) * DAY_MS).toISOString().slice(0, 10);
  if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/u.test(value) || Number.isNaN(Date.parse(value)))
    throw new Error(`--since must be YYYY-MM-DD or Nd, not ${value}`);
  return value;
}

/** Every `YYYY-MM` from the month of `since` to the month of `until`. */
export function monthsBetween(since: string, until: string): string[] {
  const months: string[] = [];
  const d = new Date(`${since.slice(0, 7)}-01T00:00:00Z`);
  const last = until.slice(0, 7);
  while (d.toISOString().slice(0, 7) <= last) {
    months.push(d.toISOString().slice(0, 7));
    d.setUTCMonth(d.getUTCMonth() + 1);
  }
  return months;
}

/** When a review signal counts: the merge of its PR. */
export const when = (s: Signal): string => (s.pr?.merged_at ?? s.date).slice(0, 10);

export const inWindow = (s: Signal, since: string, until: string): boolean => when(s) >= since && when(s) <= until;

type Json = Record<string, unknown>;
const isRecord = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v);
const isString = (v: unknown): v is string => typeof v === 'string';

interface Asset {
  name: string;
  url: string;
  updated: string;
}

const assetsOf = (release: unknown): Asset[] =>
  isRecord(release) && Array.isArray(release.assets)
    ? release.assets.flatMap((a: unknown) =>
        isRecord(a) && isString(a.name) && isString(a.browser_download_url) && isString(a.updated_at)
          ? [{ name: a.name, url: a.browser_download_url, updated: a.updated_at }]
          : [],
      )
    : [];

export interface SyncOptions {
  api: GitHubApi;
  /** Downloads one asset URL as text. */
  fetchText: (url: string) => Promise<string>;
  /** This repository, `owner/name`: where the release is. */
  repo: string;
  dir: string;
  months: string[];
}

/** Downloads the release assets of `months` and `reviewers.json` into the
 *  cache, each only when the release has a newer copy than the cache.
 *  Returns the names it wrote. A private source is never in the release,
 *  so its local files stay untouched. */
export async function syncRelease(o: SyncOptions): Promise<string[]> {
  const assets = assetsOf(await o.api(`repos/${o.repo}/releases/tags/${RELEASE}`));
  const wanted = assets.filter((a) => {
    const month = ASSET.exec(a.name)?.[2];
    return a.name === REVIEWERS_FILE || (month !== undefined && o.months.includes(month));
  });
  mkdirSync(o.dir, { recursive: true });
  const stale = wanted.filter((a) => {
    const path = join(o.dir, a.name);
    return !existsSync(path) || statSync(path).mtimeMs < Date.parse(a.updated);
  });
  // One asset after another: a month is about 1 MB.
  return inSeries(stale, async (a) => {
    writeFileSync(join(o.dir, a.name), await o.fetchText(a.url));
    return a.name;
  });
}

/** Reviewer trust by login: `reviewers.json` of the cache, or computed from
 *  the signals when the cache has none. */
export function trustByLogin(dir: string, signals: Signal[]): Map<string, number> {
  const path = join(dir, REVIEWERS_FILE);
  if (existsSync(path)) {
    const body: unknown = JSON.parse(readFileSync(path, 'utf8'));
    const list = isRecord(body) && Array.isArray(body.reviewers) ? body.reviewers : [];
    return new Map(
      list.flatMap((r: unknown) =>
        isRecord(r) && isString(r.login) && typeof r.trust === 'number' ? [[r.login, r.trust] as const] : [],
      ),
    );
  }
  return new Map(reviewers(signals).map((r) => [r.login, r.trust]));
}

/** Trust of a signal's author; the prior for a reviewer without a record,
 *  and 1 for a change without an author (a drift line). */
export function signalTrust(s: Signal, byLogin: Map<string, number>): number {
  if (s.author === undefined) return 1;
  return byLogin.get(s.author.login) ?? trust({ associations: [s.author.association], comments: 0, outdated: 0 });
}

export interface StoreOptions {
  dir: string;
  since: string;
  until: string;
  /** Only these sources; all when empty. */
  sources: string[];
}

/** The stored review signals of the window. */
export const storeSignals = (o: StoreOptions): Signal[] =>
  readStore(o.dir).filter(
    (s) => (o.sources.length === 0 || o.sources.includes(s.source)) && inWindow(s, o.since, o.until),
  );

/** Signals from a JSON Lines file (`--signals`), e.g. a monthly asset or
 *  `mine-trunk.ts report --signals`. */
export const fileSignals = (path: string): Signal[] => parseSignals(readFileSync(path, 'utf8'));

export const remap = (signals: Signal[], index: MapIndex): Signal[] => mapSignals(signals, index);

// ---- the open drift issue ----------------------------------------------------

export interface DriftIssue {
  number: number;
  url: string;
  body: string;
}

/** The newest open drift issue, or undefined. */
export async function openDriftIssue(api: GitHubApi, repo: string): Promise<DriftIssue | undefined> {
  const issues = await allPages(api, `repos/${repo}/issues?labels=${ISSUE_LABEL}&state=open`);
  const open = issues.flatMap((i: unknown) =>
    isRecord(i) &&
    typeof i.number === 'number' &&
    isString(i.html_url) &&
    (i.body === null || isString(i.body)) &&
    i.pull_request === undefined
      ? [{ number: i.number, url: i.html_url, body: i.body ?? '' }]
      : [],
  );
  return open.toSorted((a, b) => b.number - a.number)[0];
}

const KINDS: [RegExp, SignalKind][] = [
  [/^(?:Added|Removed) agent skill bullet/u, 'skill-bullet'],
  [/^(?:Added|Removed) guideline heading/u, 'guideline-heading'],
  [/^(?:Added|Removed) core guide ID/u, 'guide-id'],
  [/^(?:Added|Removed) PR template line/u, 'template-line'],
  [/^Rule class/u, 'rule-class'],
];

const kindOf = (text: string): SignalKind => KINDS.find(([re]) => re.test(text))?.[1] ?? 'upstream-line';

/** The map a drift issue group stands for: `### ID: title`, a reference,
 *  or the skill alone. */
function groupMap(skill: string, heading: string): SignalMap {
  const rule = /^### ([A-Z]+-[0-9]{3})\b/u.exec(heading)?.[1];
  if (rule !== undefined) return { skill, rules: [rule], via: 'trunk.source' };
  const reference = /^### `([^`]+)`/u.exec(heading)?.[1];
  if (reference !== undefined) return { skill, reference, rules: [], via: 'routes' };
  return { skill, rules: [], via: 'source' };
}

/** The changes listed in a drift issue body, as signals with the map the
 *  issue gives them. The review section and the commit list are left out:
 *  review comments come from the release, with their full text. */
export function driftSignals(issue: DriftIssue, repo: string): Signal[] {
  const out: Signal[] = [];
  let skill: string | undefined;
  let map: SignalMap | undefined;
  for (const line of issue.body.split('\n')) {
    const h2 = /^## (.+)$/u.exec(line)?.[1];
    if (h2 !== undefined) {
      if (h2 === 'Commits' || h2.startsWith('Review comments')) break;
      skill = h2.startsWith('sw-') ? h2 : undefined;
      map = undefined;
      continue;
    }
    if (line.startsWith('### ') && skill !== undefined) {
      map = groupMap(skill, line);
      continue;
    }
    if (!line.startsWith('- ')) continue;
    const links = [...line.matchAll(/\]\((https:\/\/github\.com\/[^)\s]+)\)/gu)].map((m) => m[1] ?? '');
    const url = links.at(-1) ?? issue.url;
    const text = line.slice(2).replace(/\s*\([^()]*\]\([^)]*\)[^()]*\)\s*$/u, '');
    out.push({
      id: `drift#${issue.number}/${out.length + 1}`,
      source: 'drift-issue',
      kind: kindOf(text),
      repo,
      url,
      date: '',
      path: /`([^`]+\/[^`]+)`/u.exec(text)?.[1] ?? '',
      text,
      map: map === undefined ? [] : [map],
    });
  }
  return out;
}

// ---- everything a run reads -----------------------------------------------------

export interface LoadOptions {
  root: string;
  since: string;
  until: string;
  /** Review sources to read from the cache; all when empty. */
  sources: string[];
  /** A signals file instead of the cache, the release and the drift issue. */
  signalsFile?: string;
  /** No download and no drift issue: the cache only. */
  offline: boolean;
  api?: GitHubApi;
  fetchText?: (url: string) => Promise<string>;
  /** This repository on GitHub, for the release and the drift issue. */
  repo: string;
  log: (text: string) => void;
}

export interface Loaded {
  signals: Signal[];
  /** What was read, for the report. */
  inputs: string[];
  trust: Map<string, number>;
}

/** The window's review signals from the cache (after downloading newer
 *  release assets) plus the open drift issue, or a signals file alone. */
export async function loadInput(o: LoadOptions, catalog: Catalog): Promise<Loaded> {
  const index = mapIndex(o.root, catalog, loadSources(o.root));
  const dir = join(o.root, CACHE_DIR);
  if (o.signalsFile !== undefined) {
    const signals = remap(fileSignals(o.signalsFile), index);
    return { signals, inputs: [o.signalsFile], trust: trustByLogin(dir, signals) };
  }
  const inputs: string[] = [];
  let drift: Signal[] = [];
  if (!o.offline && o.api !== undefined && o.fetchText !== undefined) {
    const months = monthsBetween(o.since, o.until);
    const written = await syncRelease({ api: o.api, fetchText: o.fetchText, repo: o.repo, dir, months });
    if (written.length > 0) o.log(`Downloaded ${written.join(', ')}\n`);
    const issue = await openDriftIssue(o.api, o.repo);
    if (issue !== undefined) {
      drift = driftSignals(issue, o.repo);
      inputs.push(`${issue.url} (${String(drift.length)} change(s))`);
    }
  }
  const stored = remap(storeSignals({ dir, since: o.since, until: o.until, sources: o.sources }), index);
  inputs.unshift(`${CACHE_DIR}/ (${String(stored.length)} review signal(s))`);
  return { signals: [...stored, ...drift], inputs, trust: trustByLogin(dir, stored) };
}
