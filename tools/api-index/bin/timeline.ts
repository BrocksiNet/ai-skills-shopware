// Builds every release tag from --from on (release candidates left out),
// plus an optional trunk ref, and merges them into one timeline.
//
//   node tools/api-index/bin/timeline.ts --repo ~/shopware \
//     [--from 6.5.0.0] [--trunk origin/trunk] [--cache <dir>] \
//     [--out api-index.json.gz] [--index index.json]
//
// Built snapshots are cached per tag and commit; a second run only builds
// what is new. Trunk moves, so it is cached by its commit.
import { parseArgs } from 'node:util';
import { gzipSync } from 'node:zlib';
import { listTags } from '../src/git.ts';
import type { Snapshot } from '../src/model.ts';
import { defaultCacheDir, snapshotFor, writeJson } from '../src/store.ts';
import { mergeSnapshots, releaseTags } from '../src/timeline.ts';

function main(): number {
  const { values } = parseArgs({
    options: {
      repo: { type: 'string' },
      from: { type: 'string', default: '6.5.0.0' },
      trunk: { type: 'string' },
      cache: { type: 'string' },
      out: { type: 'string' },
      index: { type: 'string' },
    },
  });
  if (values.repo === undefined) {
    process.stderr.write(
      'usage: timeline.ts --repo <shopware clone> [--from 6.5.0.0] [--trunk <ref>] [--cache <dir>] [--out <file>] [--index <file>]\n',
    );
    return 2;
  }
  const repo = values.repo;
  const cacheDir = values.cache ?? defaultCacheDir(process.env);
  const tags = releaseTags(listTags(repo, 'v6.*'), values.from);
  const refs = tags.map((tag) => ({ ref: tag, label: tag }));
  if (values.trunk !== undefined) refs.push({ ref: values.trunk, label: 'trunk' });
  const started = performance.now();
  const snapshots: Snapshot[] = [];
  let built = 0;
  let failed = 0;
  for (const { ref, label } of refs) {
    const result = snapshotFor(repo, ref, cacheDir, label);
    snapshots.push(result.snapshot);
    if (result.built) {
      built += 1;
      process.stderr.write(`built ${label}: ${result.snapshot.items.length} items\n`);
    }
    failed += result.snapshot.failed.length;
  }
  const timeline = mergeSnapshots(snapshots);
  const json = JSON.stringify(timeline);
  const seconds = ((performance.now() - started) / 1000).toFixed(1);
  process.stdout.write(
    `${timeline.releases.length} releases (${built} built, ${refs.length - built} cached) in ${seconds} s\n` +
      `${timeline.items.length} items, ${failed} files failed to parse\n` +
      `${(json.length / 1e6).toFixed(1)} MB JSON, ${(gzipSync(json).length / 1e6).toFixed(2)} MB gzip\n`,
  );
  if (values.out !== undefined) writeJson(values.out, timeline);
  if (values.index !== undefined) {
    writeJson(values.index, { schema: timeline.schema, generator: timeline.generator, releases: timeline.releases });
  }
  return failed > 0 ? 1 : 0;
}

process.exitCode = main();
