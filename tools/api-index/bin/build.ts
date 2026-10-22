// Builds the public API snapshot of one ref of a shopware/shopware clone.
//
//   node tools/api-index/bin/build.ts --repo ~/shopware --ref v6.7.4.0 [--out api-v6.7.4.0.json.gz]
//
// Without --out it prints the counts only. A `.gz` file is gzipped.
import { writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { gzipSync } from 'node:zlib';
import { buildSnapshot } from '../src/build.ts';

function main(): number {
  const { values } = parseArgs({
    options: { repo: { type: 'string' }, ref: { type: 'string' }, out: { type: 'string' } },
  });
  if (values.repo === undefined || values.ref === undefined) {
    process.stderr.write('usage: build.ts --repo <shopware clone> --ref <tag or commit> [--out <file>]\n');
    return 2;
  }
  const started = performance.now();
  const snapshot = buildSnapshot({ repo: values.repo, ref: values.ref, now: () => new Date() });
  const json = JSON.stringify(snapshot);
  const counts = new Map<string, number>();
  for (const item of snapshot.items) counts.set(item.kind, (counts.get(item.kind) ?? 0) + 1);
  const seconds = ((performance.now() - started) / 1000).toFixed(1);
  process.stdout.write(
    `${snapshot.ref} ${snapshot.sha.slice(0, 10)}: ${snapshot.items.length} items in ${seconds} s, ` +
      `${snapshot.failed.length} files failed to parse\n` +
      `  ${[...counts].map(([kind, count]) => `${kind} ${count}`).join(', ')}\n` +
      `  ${(json.length / 1e6).toFixed(1)} MB JSON, ${(gzipSync(json).length / 1e6).toFixed(2)} MB gzip\n`,
  );
  if (values.out !== undefined) writeFileSync(values.out, values.out.endsWith('.gz') ? gzipSync(json) : json);
  return snapshot.failed.length > 0 ? 1 : 0;
}

process.exitCode = main();
