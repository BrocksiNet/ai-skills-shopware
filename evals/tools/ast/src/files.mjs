import { readdirSync } from 'node:fs';
import { join } from 'node:path';

const SKIP = new Set(['node_modules', 'vendor', '.git']);

export function walkFiles(root, visit) {
  const stack = [root];
  while (stack.length > 0) {
    const dir = stack.pop();
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const ent of entries) {
      if (SKIP.has(ent.name)) {
        continue;
      }
      const path = join(dir, ent.name);
      if (ent.isDirectory()) {
        stack.push(path);
      } else if (ent.isFile()) {
        visit(path);
      }
    }
  }
}

export function findFiles(root, match) {
  const hits = [];
  walkFiles(root, (path) => {
    if (match(path)) {
      hits.push(path);
    }
  });
  return hits;
}

export function pathEndsWith(path, suffix) {
  return path.endsWith(suffix) || path.endsWith(suffix.replaceAll('/', '\\'));
}
