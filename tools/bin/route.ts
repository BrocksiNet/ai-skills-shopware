// Print the references each skill's routes.json selects for a diff (plan WP4).
//
//   node tools/bin/route.ts <diff.patch>      # or the diff on stdin
//   git diff main | node tools/bin/route.ts
//
// Output: JSON, skill -> references, for skills with at least one match.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { routeDiff } from '../src/routes.ts';

const root = resolve(import.meta.dirname, '../..');
const diff = readFileSync(process.argv[2] ?? 0, 'utf8');
console.log(JSON.stringify(routeDiff(root, diff), null, 2));
