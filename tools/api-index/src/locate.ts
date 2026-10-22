// Where api-facts finds the index: `--index`, `$API_INDEX`, or the cached
// download of the `api-index` release asset, fetched again after a week.
import { existsSync, mkdirSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { defaultCacheDir } from './store.ts';

export const INDEX_URL =
  'https://github.com/BrocksiNet/ai-skills-shopware/releases/download/api-index/api-index.json.gz';
const MAX_AGE_MS = 7 * 24 * 3600 * 1000;

export interface Located {
  path: string;
  /** Why this file, for the report's header: a note when it may be stale. */
  note?: string;
}

async function download(url: string, path: string): Promise<void> {
  const response = await fetch(url, { redirect: 'follow' });
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(`${path}.part`, Buffer.from(await response.arrayBuffer()));
  renameSync(`${path}.part`, path);
}

export async function locateIndex(
  explicit: string | undefined,
  env: NodeJS.ProcessEnv,
  allowFetch: boolean,
  now = Date.now(),
): Promise<Located> {
  if (explicit !== undefined) return { path: explicit };
  if (env.API_INDEX !== undefined && env.API_INDEX !== '') return { path: env.API_INDEX };
  const cached = join(defaultCacheDir(env), 'api-index.json.gz');
  const fresh = existsSync(cached) && now - statSync(cached).mtimeMs < MAX_AGE_MS;
  if (fresh || !allowFetch) {
    if (existsSync(cached)) return { path: cached };
    throw new Error(`no index at ${cached}; pass --index or allow the download`);
  }
  try {
    await download(INDEX_URL, cached);
    return { path: cached };
  } catch (error) {
    if (!existsSync(cached)) throw error;
    return { path: cached, note: 'the download failed, so the cached index may be out of date' };
  }
}
