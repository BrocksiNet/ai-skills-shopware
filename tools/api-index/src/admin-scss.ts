// Historical 6.5-6.7 Admin SCSS variables and mixins (`~scss/variables`,
// `~scss/mixins`). A plugin targeting `~6.5.0 || ~6.6.0 || ~6.7.0` fails its
// Admin SCSS build when a variable or mixin is missing in an older minor or
// removed in a newer release.
import type { Flags, Item } from './model.ts';

export const ADMIN_SCSS_VARS = 'src/Administration/Resources/app/administration/src/app/assets/scss/variables.scss';
export const ADMIN_SCSS_MIXINS = 'src/Administration/Resources/app/administration/src/app/assets/scss/mixins.scss';

export function isAdminScssSource(path: string): boolean {
  return path === ADMIN_SCSS_VARS || path === ADMIN_SCSS_MIXINS;
}

function parseDeprecated(comment: string): string | undefined {
  if (!/@deprecated\b/u.test(comment)) return undefined;
  const parts = /tag:v?(\d+)\.(\d+)\.(\d+)/u.exec(comment);
  return parts === null ? '' : `v${parts[1]}.${parts[2]}.${parts[3]}`;
}

function deprecationFlags(version: string | undefined): Flags {
  return version === undefined ? {} : { deprecated: version };
}

/** Normalizes a mixin parameter list (`($a, $b: 1)`) for deterministic signatures. */
function normalizeParams(raw: string | undefined): string {
  if (raw === undefined) return '';
  const inner = raw.slice(1, -1).trim();
  if (inner === '') return '';
  return `(${inner
    .split(',')
    .map((part) => part.trim().replaceAll(/\s+/gu, ' '))
    .filter((part) => part !== '')
    .join(', ')})`;
}

function parseDeclaration(line: string, file: string, deprecated: string | undefined): Item | undefined {
  const varMatch = /^\$([A-Za-z0-9_-]+)\s*:/u.exec(line);
  if (varMatch?.[1] !== undefined) {
    return { id: `scss:var:$${varMatch[1]}`, kind: 'scss', file, signature: '', flags: deprecationFlags(deprecated) };
  }
  const mixinMatch = /^@mixin\s+([A-Za-z0-9_-]+)\s*(\([^)]*\))?/u.exec(line);
  if (mixinMatch?.[1] !== undefined) {
    return {
      id: `scss:mixin:${mixinMatch[1]}`,
      kind: 'scss',
      file,
      signature: normalizeParams(mixinMatch[2]),
      flags: deprecationFlags(deprecated),
    };
  }
  return undefined;
}

function nextBraceDepth(depth: number, rawLine: string): number {
  let next = depth;
  for (const ch of rawLine.replace(/\/\/.*$/u, '')) {
    if (ch === '{') next += 1;
    else if (ch === '}' && next > 0) next -= 1;
  }
  return next;
}

/** Extracts top-level `$var:` and `@mixin name(...)` items from Admin SCSS sources. */
export function adminScssItems(source: string, file: string): Item[] {
  const items: Item[] = [];
  const seen = new Set<string>();
  let pendingDeprecated: string | undefined;
  let blockComment: string | undefined;
  let braceDepth = 0;

  for (const rawLine of source.split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (blockComment !== undefined) {
      const end = rawLine.indexOf('*/');
      if (end === -1) {
        blockComment += `\n${rawLine}`;
      } else {
        pendingDeprecated = parseDeprecated(`${blockComment}\n${rawLine.slice(0, end)}`) ?? pendingDeprecated;
        blockComment = undefined;
      }
      continue;
    }
    if (line === '') {
      pendingDeprecated = undefined;
      continue;
    }
    if (line.startsWith('/*')) {
      const end = line.indexOf('*/', 2);
      if (end === -1) blockComment = line.slice(2);
      else pendingDeprecated = parseDeprecated(line.slice(2, end)) ?? pendingDeprecated;
      continue;
    }
    if (line.startsWith('//')) {
      pendingDeprecated = parseDeprecated(line) ?? pendingDeprecated;
      continue;
    }
    if (braceDepth === 0) {
      const item = parseDeclaration(line, file, pendingDeprecated);
      if (item !== undefined && !seen.has(item.id)) {
        seen.add(item.id);
        items.push(item);
      }
      pendingDeprecated = undefined;
    }
    braceDepth = nextBraceDepth(braceDepth, rawLine);
  }
  return items;
}
