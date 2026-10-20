// Print the references each skill's routes.json selects for a diff (plan WP4).
//
//   node tools/bin/route.ts <diff.patch>      # or the diff on stdin
//   git diff main | node tools/bin/route.ts
//
// Output: JSON with three maps of skill -> references. `selected` is what the
// diff triggers; `always` and `on_demand` do not depend on the diff and are
// listed so a caller (the model, or a classifier later) sees the full choice.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { routeDiff } from '../src/routes.ts';

const root = resolve(import.meta.dirname, '../..');
const diff = readFileSync(process.argv[2] ?? 0, 'utf8');
console.log(JSON.stringify(routeDiff(root, diff), null, 2));
