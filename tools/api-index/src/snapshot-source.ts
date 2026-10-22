// Where api-diff and check-breaks get a release's snapshot: built from a
// shopware/shopware clone (and cached), or rebuilt from the index timeline.
import { locateIndex } from './locate.ts';
import type { Snapshot } from './model.ts';
import { defaultCacheDir, loadTimeline, snapshotFor } from './store.ts';
import { snapshotAt } from './timeline.ts';

export interface SourceOptions {
  /** A clone of shopware/shopware: refs are built from it. */
  repo?: string | undefined;
  /** api-index.json.gz; else $API_INDEX or the cached release asset. */
  index?: string | undefined;
  cache?: string | undefined;
  fetch: boolean;
}

/** A snapshot by ref (with a clone) or by release (from the index);
 *  undefined when the index does not have the release. */
export type SnapshotSource = (ref: string) => Snapshot | undefined;

export async function openSource(options: SourceOptions, env: NodeJS.ProcessEnv): Promise<SnapshotSource> {
  const { repo } = options;
  if (repo !== undefined) {
    const cacheDir = options.cache ?? defaultCacheDir(env);
    return (ref) => snapshotFor(repo, ref, cacheDir, ref).snapshot;
  }
  const located = await locateIndex(options.index, env, options.fetch);
  const timeline = loadTimeline(located.path);
  return (ref) => snapshotAt(timeline, ref);
}
