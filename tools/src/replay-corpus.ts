// The recorded route replay corpus, evals/routing-replay/<pr>/: case.json
// (PR, comment-mapped references, hand labels) and a trimmed diff.patch.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import type { Label, ReplayCase } from './route-replay.ts';

export const CASE_FILE = 'case.json';
export const DIFF_FILE = 'diff.patch';

type Json = Record<string, unknown>;
const isRecord = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v);

const isLabel = (v: unknown): v is Label =>
  isRecord(v) &&
  typeof v.reference === 'string' &&
  typeof v.url === 'string' &&
  typeof v.why === 'string' &&
  (v.rule === undefined || typeof v.rule === 'string');

const isUrlMap = (v: unknown): v is Record<string, string[]> =>
  isRecord(v) && Object.values(v).every((urls) => Array.isArray(urls) && urls.every((u) => typeof u === 'string'));

/** One recorded case; throws when case.json is malformed. */
export function readCase(dir: string): ReplayCase {
  const value: unknown = JSON.parse(readFileSync(join(dir, CASE_FILE), 'utf8'));
  if (
    !isRecord(value) ||
    typeof value.repo !== 'string' ||
    typeof value.pr !== 'number' ||
    typeof value.title !== 'string' ||
    !isUrlMap(value.expected)
  ) {
    throw new Error(`${dir}/${CASE_FILE}: needs repo, pr, title and expected`);
  }
  const labels: unknown = value.labels ?? [];
  if (!Array.isArray(labels) || !labels.every((l) => isLabel(l))) throw new Error(`${dir}/${CASE_FILE}: bad labels`);
  return {
    repo: value.repo,
    pr: value.pr,
    title: value.title,
    expected: value.expected,
    labels,
    ...(typeof value.commit === 'string' ? { commit: value.commit } : {}),
    diff: readFileSync(join(dir, DIFF_FILE), 'utf8'),
  };
}

/** Every case of a corpus directory, by PR number. */
export function readCorpus(dir: string): ReplayCase[] {
  return readdirSync(dir)
    .filter((d) => existsSync(join(dir, d, CASE_FILE)))
    .map((d) => readCase(join(dir, d)))
    .toSorted((a, b) => a.pr - b.pr);
}

/** case.json for a recorded PR; the diff goes next to it. */
export function caseJson(c: Omit<ReplayCase, 'diff'>): string {
  const body = {
    repo: c.repo,
    pr: c.pr,
    title: c.title,
    url: `https://github.com/${c.repo}/pull/${c.pr}`,
    ...(c.commit === undefined ? {} : { commit: c.commit }),
    expected: c.expected,
    ...(c.labels.length > 0 ? { labels: c.labels } : {}),
  };
  return `${JSON.stringify(body, null, 2)}\n`;
}
