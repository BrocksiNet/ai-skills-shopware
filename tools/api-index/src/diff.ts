// The lines a unified diff adds, per file of the new tree, and the files it
// touches, and a patched copy of a tree. Enough for `git diff` and
// `diff -u` output; binary hunks are skipped.
import { execFileSync } from 'node:child_process';
import { cpSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

export interface DiffLines {
  /** New-tree path → added line numbers. */
  added: Map<string, Set<number>>;
  /** Every new-tree path the diff touches, deleted files excluded. */
  files: Set<string>;
}

function newPath(line: string): string | undefined {
  const path = line.slice(4).split('\t')[0]?.trim() ?? '';
  if (path === '/dev/null' || path === '') return undefined;
  return path.replace(/^b\//u, '');
}

export function parseDiff(text: string): DiffLines {
  const added = new Map<string, Set<number>>();
  const files = new Set<string>();
  let file: string | undefined;
  let line = 0;
  for (const raw of text.split('\n')) {
    if (raw.startsWith('diff --git ')) {
      file = undefined;
      line = 0;
      continue;
    }
    if (raw.startsWith('+++ ')) {
      file = newPath(raw);
      if (file !== undefined) files.add(file);
      continue;
    }
    const hunk = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/u.exec(raw);
    if (hunk !== null) {
      line = Number(hunk[1]);
      continue;
    }
    if (file === undefined || line === 0) continue;
    if (raw.startsWith('+')) {
      const set = added.get(file) ?? new Set<number>();
      set.add(line);
      added.set(file, set);
      line += 1;
    } else if (raw.startsWith(' ') || raw === '') line += 1;
  }
  return { added, files };
}

/** A copy of `dir` with the patch applied, for a patch that is not applied yet. */
export function appliedCopy(dir: string, patch: string): string {
  const copy = mkdtempSync(join(tmpdir(), 'api-facts.'));
  cpSync(dir, copy, { recursive: true });
  execFileSync('git', ['apply', '--whitespace=nowarn', resolve(patch)], {
    cwd: copy,
    stdio: ['ignore', 'ignore', 'inherit'],
  });
  return copy;
}
