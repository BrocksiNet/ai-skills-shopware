// File-level side of enforced.ts: which files the render changes for each
// skill. Shared by tools/bin/render-enforced.ts (writes) and the validator
// (reports drift).
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Catalog } from './catalog.ts';
import { REFERENCE, enforcedItems, render } from './enforced.ts';
import { compareText } from './text.ts';

export interface FileChange {
  /** Repo-relative path. */
  file: string;
  /** New content, or null to delete the file. */
  next: string | null;
}

const read = (path: string): string | null => (existsSync(path) ? readFileSync(path, 'utf8') : null);

/** Changes needed to bring every skill in line with the catalog. Throws on
 *  unbalanced markers or a hand-written file at the reference path. */
export function enforcedChanges(root: string, catalog: Catalog): FileChange[] {
  const changes: FileChange[] = [];
  for (const skill of readdirSync(join(root, 'skills')).toSorted(compareText)) {
    const skillFile = `skills/${skill}/SKILL.md`;
    const skillText = read(join(root, skillFile));
    if (skillText === null) continue;
    const out = render(skillText, enforcedItems(catalog, skill));
    if (out.skill !== skillText) changes.push({ file: skillFile, next: out.skill });

    const refFile = `skills/${skill}/${REFERENCE}`;
    const refText = read(join(root, refFile));
    if (refText !== null && !refText.includes('generated from rules/catalog.json')) {
      throw new Error(`${refFile} exists but is not generated; rename it`);
    }
    if (out.reference !== refText) changes.push({ file: refFile, next: out.reference });
  }
  return changes;
}
