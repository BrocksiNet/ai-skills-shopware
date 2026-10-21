// Borrowed references and the rule audience (plan WP6). A skill whose
// routes.json sets `audience` reviews for those audiences only, so it must
// name, as a code span anywhere in its files, every active rule in a borrowed
// reference that is for none of them. The model skips what the skill names;
// a new core-only rule in a borrowed reference fails CI until it is named.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { AUDIENCES, type Audience, isActive, type Rule } from './catalog.ts';
import { BORROWED, ROUTES_FILE } from './route-borrow.ts';
import { compareText } from './text.ts';

type Json = Record<string, unknown>;
const isRecord = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v);
const isAudience = (v: unknown): v is Audience => AUDIENCES.some((a) => a === v);

/** A code span naming a rule ID, as the rule scanner reports it. */
export interface Mention {
  id: string;
  file: string;
}

interface Borrower {
  skill: string;
  audience: Audience[];
  /** Repo paths of the borrowed references. */
  files: Set<string>;
}

function borrower(root: string, skill: string): Borrower | string | null {
  const path = join(root, 'skills', skill, ROUTES_FILE);
  if (!existsSync(path)) return null;
  const value: unknown = JSON.parse(readFileSync(path, 'utf8'));
  if (!isRecord(value) || value.audience === undefined) return null;
  const list: unknown = value.audience;
  if (!Array.isArray(list) || list.length === 0 || !list.every((a) => isAudience(a))) {
    return `skills/${skill}/${ROUTES_FILE}: audience must be a non-empty list of ${AUDIENCES.join(', ')}`;
  }
  const routes: unknown[] = Array.isArray(value.routes) ? value.routes : [];
  const files = new Set<string>();
  for (const r of routes) {
    const match = isRecord(r) && typeof r.reference === 'string' ? BORROWED.exec(r.reference) : null;
    const [, lender, reference] = match ?? [];
    if (lender !== undefined && reference !== undefined) files.add(`skills/${lender}/${reference}`);
  }
  return { skill, audience: list, files };
}

/** Errors for out-of-audience rules a borrowing skill does not name. */
export function borrowedAudienceErrors(root: string, rules: Rule[], mentions: Mention[]): string[] {
  const errors: string[] = [];
  for (const skill of readdirSync(join(root, 'skills')).toSorted(compareText)) {
    const b = borrower(root, skill);
    if (b === null) continue;
    if (typeof b === 'string') {
      errors.push(b);
      continue;
    }
    const named = new Set(mentions.filter((m) => m.file.startsWith(`skills/${skill}/`)).map((m) => m.id));
    for (const rule of rules) {
      if (!isActive(rule) || !b.files.has(rule.file) || named.has(rule.id)) continue;
      if (rule.audience.some((a) => b.audience.includes(a))) continue;
      errors.push(
        `skills/${skill}: borrows ${rule.file} but does not name ${rule.id} (audience ${rule.audience.join(', ')}) as out of scope`,
      );
    }
  }
  return errors;
}
