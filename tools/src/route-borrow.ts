// Borrowed routes (see routes.ts): a skill's route for
// `../<skill>/references/<file>.md` with no triggers of its own takes them
// from the lending skill's route for that file.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export const ROUTES_FILE = 'routes.json';

type Json = Record<string, unknown>;
const isRecord = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v);

export const BORROWED = /^\.\.\/([^/]+)\/(references\/.+)$/u;
const OWN_KINDS = ['paths_any', 'anchors_any', 'always', 'on_demand'] as const;

/** The other skill's route for a borrowed reference, or an error. */
function lendingRoute(skillDir: string, skill: string, reference: string): Json | string {
  const path = join(skillDir, '..', skill, ROUTES_FILE);
  if (!existsSync(path)) return `${skill} has no ${ROUTES_FILE}`;
  const value: unknown = JSON.parse(readFileSync(path, 'utf8'));
  const routes: unknown[] = isRecord(value) && Array.isArray(value.routes) ? value.routes : [];
  const found = routes.find((r) => isRecord(r) && r.reference === reference);
  return isRecord(found) ? found : `${skill} has no route for ${reference}`;
}

/** Borrowed routes filled in from the lending skill; `errors` names the
 *  ones that cannot be. Anything else passes through unchanged. */
export function resolveBorrowed(skillDir: string, value: unknown): { value: unknown; errors: string[] } {
  if (!isRecord(value) || !Array.isArray(value.routes)) return { value, errors: [] };
  const errors: string[] = [];
  const list: unknown[] = value.routes;
  const routes = list.map((r, i) => {
    const match = isRecord(r) && typeof r.reference === 'string' ? BORROWED.exec(r.reference) : null;
    const [, skill, reference] = match ?? [];
    if (!isRecord(r) || skill === undefined || reference === undefined) return r;
    if (OWN_KINDS.some((k) => r[k] !== undefined)) return r;
    const source = lendingRoute(skillDir, skill, reference);
    if (typeof source === 'string') {
      errors.push(`routes[${i}]: ${source}`);
      return r;
    }
    const borrowed: Json = { when: source.when };
    for (const k of OWN_KINDS) if (source[k] !== undefined) borrowed[k] = source[k];
    return Object.assign(borrowed, r);
  });
  return { value: { ...value, routes }, errors };
}
