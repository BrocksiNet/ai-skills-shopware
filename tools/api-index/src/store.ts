// Snapshots on disk: a cache of built releases, so the timeline only builds
// what is new. Tags never change, so a tag is built once per generator.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { gunzipSync, gzipSync } from 'node:zlib';
import { GENERATOR, type Item, type Snapshot } from './model.ts';
import { isNode } from './node.ts';
import type { Timeline, TimelineItem } from './timeline.ts';

/** `$XDG_CACHE_HOME/ai-skills-shopware/api-index`, or under `~/.cache`. */
export function defaultCacheDir(env: NodeJS.ProcessEnv): string {
  const base =
    env.XDG_CACHE_HOME === undefined || env.XDG_CACHE_HOME === '' ? join(homedir(), '.cache') : env.XDG_CACHE_HOME;
  return join(base, 'ai-skills-shopware', 'api-index');
}

/** One file per ref and commit, under the generator version that built it. */
export function snapshotPath(cacheDir: string, ref: string, sha: string): string {
  const safe = ref.replaceAll(/[^\w.-]+/gu, '_');
  return join(cacheDir, GENERATOR.replaceAll(/[^\w.-]+/gu, '_'), `${safe}-${sha.slice(0, 12)}.json.gz`);
}

function isItem(value: unknown): value is Item {
  return isNode(value) && typeof value.id === 'string' && typeof value.kind === 'string' && isNode(value.flags);
}

export function isSnapshot(value: unknown): value is Snapshot {
  return (
    isNode(value) &&
    typeof value.ref === 'string' &&
    typeof value.sha === 'string' &&
    typeof value.builtAt === 'string' &&
    typeof value.generator === 'string' &&
    Array.isArray(value.failed) &&
    Array.isArray(value.items) &&
    value.items.every((item) => isItem(item))
  );
}

function isTimelineItem(value: unknown): value is TimelineItem {
  return isNode(value) && typeof value.id === 'string' && Array.isArray(value.present) && isNode(value.history);
}

export function isTimeline(value: unknown): value is Timeline {
  return (
    isNode(value) &&
    typeof value.schema === 'number' &&
    Array.isArray(value.releases) &&
    value.releases.every((release) => isNode(release) && typeof release.release === 'string') &&
    Array.isArray(value.items) &&
    value.items.every((item) => isTimelineItem(item))
  );
}

/** JSON from a file, gunzipped when it ends in `.gz`. */
export function readJson(path: string): unknown {
  const raw = readFileSync(path);
  const text = (path.endsWith('.gz') ? gunzipSync(raw) : raw).toString();
  const value: unknown = JSON.parse(text);
  return value;
}

export function writeJson(path: string, value: unknown): void {
  const json = JSON.stringify(value);
  writeFileSync(path, path.endsWith('.gz') ? gzipSync(json) : json);
}

export function loadSnapshot(path: string): Snapshot | undefined {
  if (!existsSync(path)) return undefined;
  const value = readJson(path);
  return isSnapshot(value) ? value : undefined;
}

export function saveSnapshot(path: string, snapshot: Snapshot): void {
  mkdirSync(join(path, '..'), { recursive: true });
  writeJson(path, snapshot);
}

export function loadTimeline(path: string): Timeline {
  const value = readJson(path);
  if (!isTimeline(value)) throw new Error(`${path} is not an api-index timeline`);
  return value;
}
