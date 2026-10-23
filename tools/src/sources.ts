// The repositories the weekly drift job reads (plan WP12 step 1) and the
// ones whose reviews the daily collector reads (step 3). Field reference:
// rules/sources.schema.json.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { checkCatalog, readCatalog } from './catalog.ts';
import { errorMessage } from './errors.ts';

export const SOURCES_PATH = 'rules/sources.json';
export const EXTRACTORS = ['shopware-trunk', 'markdown'] as const;
export type Extractor = (typeof EXTRACTORS)[number];

/** Our skills that learn from a path prefix of a source. */
export interface SourceSkills {
  path: string;
  skills: string[];
}

export interface Source {
  /** Key in docs/.mining-state.json and in a rule's `upstream` list. */
  id: string;
  /** `owner/name` on GitHub. */
  repo: string;
  branch: string;
  extractor: Extractor;
  /** A commit counts when it touches one of these paths. */
  paths: string[];
  skills: SourceSkills[];
}

type Json = Record<string, unknown>;
const isRecord = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v);
const isText = (v: unknown): v is string => typeof v === 'string' && v !== '';
const isTextList = (v: unknown): v is string[] => Array.isArray(v) && v.length > 0 && v.every((s) => isText(s));
const isExtractor = (v: unknown): v is Extractor => EXTRACTORS.some((e) => e === v);
const ID = /^[a-z0-9-]+$/u;
const REPO = /^[\w.-]+\/[\w.-]+$/u;

function sourceSkills(
  label: string,
  v: unknown,
  known: Set<string> | undefined,
): { value: SourceSkills[]; errors: string[] } {
  if (!Array.isArray(v)) return { value: [], errors: [`${label}: skills must be a list`] };
  const value: SourceSkills[] = [];
  const errors: string[] = [];
  for (const [i, entry] of v.entries()) {
    if (!isRecord(entry) || !isText(entry.path) || !isTextList(entry.skills)) {
      errors.push(`${label}: skills[${i}] needs a path and a non-empty list of skills`);
      continue;
    }
    for (const s of entry.skills)
      if (known !== undefined && !known.has(s)) errors.push(`${label}: skills[${i}] names unknown skill ${s}`);
    value.push({ path: entry.path, skills: entry.skills });
  }
  return { value, errors };
}

function checkSource(v: unknown, i: number, known: Set<string> | undefined): { value?: Source; errors: string[] } {
  if (!isRecord(v)) return { errors: [`sources[${i}] must be an object`] };
  const label = isText(v.id) ? v.id : `sources[${i}]`;
  const errors: string[] = [];
  if (!isText(v.id) || !ID.test(v.id)) errors.push(`${label}: id must match ${ID.source}`);
  if (!isText(v.repo) || !REPO.test(v.repo)) errors.push(`${label}: repo must be owner/name`);
  if (!isText(v.branch)) errors.push(`${label}: branch must be a non-empty string`);
  if (!isExtractor(v.extractor)) errors.push(`${label}: extractor must be one of ${EXTRACTORS.join(', ')}`);
  if (!isTextList(v.paths)) errors.push(`${label}: paths must be a non-empty list of strings`);
  const skills = sourceSkills(label, v.skills, known);
  errors.push(...skills.errors);
  if (errors.length > 0 || !isText(v.id) || !isText(v.repo) || !isText(v.branch)) return { errors };
  if (!isExtractor(v.extractor) || !isTextList(v.paths)) return { errors };
  const value = { id: v.id, repo: v.repo, branch: v.branch, extractor: v.extractor, paths: v.paths };
  return { value: { ...value, skills: skills.value }, errors };
}

/** The valid sources and the errors of the others. `skills`, when given,
 *  are the skill folder names a `skills` entry may name. */
export function checkSources(value: unknown, skills?: string[]): { sources: Source[]; errors: string[] } {
  if (!isRecord(value) || !Array.isArray(value.sources)) return { sources: [], errors: ['sources must be a list'] };
  const unknown = Object.keys(value).filter((k) => !['$schema', 'sources', 'reviews'].includes(k));
  if (unknown.length > 0) return { sources: [], errors: [`unknown top-level key(s): ${unknown.join(', ')}`] };
  const known = skills === undefined ? undefined : new Set(skills);
  const sources: Source[] = [];
  const errors: string[] = [];
  const list: unknown[] = value.sources;
  for (const [i, v] of list.entries()) {
    const checked = checkSource(v, i, known);
    errors.push(...checked.errors);
    if (checked.value === undefined) continue;
    if (sources.some((s) => s.id === checked.value?.id)) errors.push(`${checked.value.id}: duplicate source id`);
    else sources.push(checked.value);
  }
  return { sources, errors };
}

/** A repository whose merged-PR reviews the daily collector reads (plan
 *  WP12 step 3). Private ones are collected locally only: their text never
 *  goes into the public `review-signals` release. */
export interface ReviewSource {
  /** Signal `source` and the prefix of its monthly files. Never renamed. */
  id: string;
  repo: string;
  /** Only PRs merged into this branch count. */
  base: string;
  private: boolean;
}

function checkReview(v: unknown, i: number): { value?: ReviewSource; errors: string[] } {
  if (!isRecord(v)) return { errors: [`reviews[${i}] must be an object`] };
  const label = isText(v.id) ? v.id : `reviews[${i}]`;
  const errors: string[] = [];
  if (!isText(v.id) || !ID.test(v.id)) errors.push(`${label}: id must match ${ID.source}`);
  if (!isText(v.repo) || !REPO.test(v.repo)) errors.push(`${label}: repo must be owner/name`);
  if (!isText(v.base)) errors.push(`${label}: base must be a non-empty string`);
  if (typeof v.private !== 'boolean') errors.push(`${label}: private must be true or false`);
  if (errors.length > 0 || !isText(v.id) || !isText(v.repo) || !isText(v.base)) return { errors };
  return { value: { id: v.id, repo: v.repo, base: v.base, private: v.private === true }, errors };
}

/** The review sources of rules/sources.json; none when the list is absent.
 *  `ids` are the drift source IDs a review source must not reuse. */
export function checkReviewSources(value: unknown, ids: string[] = []): { reviews: ReviewSource[]; errors: string[] } {
  if (!isRecord(value) || value.reviews === undefined) return { reviews: [], errors: [] };
  if (!Array.isArray(value.reviews)) return { reviews: [], errors: ['reviews must be a list'] };
  const taken = new Set(ids);
  const reviews: ReviewSource[] = [];
  const errors: string[] = [];
  const list: unknown[] = value.reviews;
  for (const [i, v] of list.entries()) {
    const checked = checkReview(v, i);
    errors.push(...checked.errors);
    const review = checked.value;
    if (review === undefined) continue;
    if (taken.has(review.id)) errors.push(`${review.id}: duplicate source id`);
    else {
      taken.add(review.id);
      reviews.push(review);
    }
  }
  return { reviews, errors };
}

/** The review sources; throws when an entry is invalid. */
export function loadReviewSources(root: string): ReviewSource[] {
  const path = join(root, SOURCES_PATH);
  if (!existsSync(path)) throw new Error(`${SOURCES_PATH} not found`);
  const value: unknown = JSON.parse(readFileSync(path, 'utf8'));
  const { sources } = checkSources(value);
  const { reviews, errors } = checkReviewSources(
    value,
    sources.map((s) => s.id),
  );
  if (errors.length > 0) throw new Error(errors.join('; '));
  return reviews;
}

/** rules/sources.json; throws when an entry is invalid. Skill names are not
 *  checked here; validate-skills does that. */
export function loadSources(root: string): Source[] {
  const path = join(root, SOURCES_PATH);
  if (!existsSync(path)) throw new Error(`${SOURCES_PATH} not found`);
  const { sources, errors } = checkSources(JSON.parse(readFileSync(path, 'utf8')));
  if (errors.length > 0) throw new Error(errors.join('; '));
  return sources;
}

/** Our skills that learn from a file of the source, by path prefix. */
export function skillsForPath(source: Source, path: string): string[] {
  const under = (prefix: string): boolean => path === prefix || path.startsWith(`${prefix.replace(/\/$/u, '')}/`);
  return [...new Set(source.skills.filter((e) => under(e.path)).flatMap((e) => e.skills))];
}

/** Errors of rules/sources.json, with `skills` the skill folder names, and
 *  catalog `upstream` entries that name no source. No file, no sources. */
export function sourceErrors(root: string, skills: string[]): string[] {
  const path = join(root, SOURCES_PATH);
  if (!existsSync(path)) return [];
  try {
    const value: unknown = JSON.parse(readFileSync(path, 'utf8'));
    const { sources, errors } = checkSources(value, skills);
    const reviews = checkReviewSources(
      value,
      sources.map((s) => s.id),
    );
    errors.push(...reviews.errors);
    const ids = new Set(sources.map((s) => s.id));
    const upstream = checkCatalog(readCatalog(root)).catalog.rules.flatMap((r) =>
      (r.upstream ?? [])
        .filter((u) => !ids.has(u.source))
        .map((u) => `${r.id}: upstream names unknown source ${u.source}`),
    );
    return [...errors.map((e) => `${SOURCES_PATH}: ${e}`), ...upstream];
  } catch (error) {
    return [`${SOURCES_PATH}: ${errorMessage(error)}`];
  }
}
