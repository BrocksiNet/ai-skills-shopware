// Historical 6.5-6.7 Admin snippet keys with placeholders and plural forms.
// Core's 6.8+ public-api snapshot will own 6.8+ snippets; this surface gives
// deterministic cross-minor api-facts and api-diff coverage for 6.5-6.7 plugins
// calling `$t('...')` / `$tc('...')`.
import { ADMIN_SRC } from './admin.ts';
import type { Item } from './model.ts';
import { isNode } from './node.ts';

export function isAdminSnippetSource(path: string): boolean {
  return (
    path.startsWith(`${ADMIN_SRC}/`) &&
    path.endsWith('/snippet/en-GB.json') &&
    !/\/(?:test|tests|e2e|__mocks__)\//u.test(path)
  );
}

/** Extracts Vue I18n placeholders (`{name}`) and plural branch count (`a | b`). */
export function snippetSignature(value: string): string {
  const placeholders = [...new Set([...value.matchAll(/\{([A-Za-z_][\w.]*)\}/gu)].map((match) => match[1] ?? ''))]
    .filter((name) => name !== '')
    .toSorted();
  const plurals = value.split(' | ').length;
  const parts: string[] = [];
  if (plurals > 1) parts.push(`plurals=${plurals}`);
  if (placeholders.length > 0) parts.push(`placeholders=${placeholders.join(',')}`);
  return parts.join(' ');
}

function collectSnippets(node: Record<string, unknown>, prefix: string, file: string, out: Item[]): void {
  for (const key of Object.keys(node).toSorted()) {
    const value = node[key];
    const fullKey = prefix === '' ? key : `${prefix}.${key}`;
    if (typeof value === 'string') {
      out.push({ id: `snippet:${fullKey}`, kind: 'snippet', file, signature: snippetSignature(value), flags: {} });
    } else if (isNode(value)) {
      collectSnippets(value, fullKey, file, out);
    }
  }
}

/** Extracts all leaf snippet keys from an Admin `en-GB.json` file. */
export function adminSnippetItems(jsonText: string, file: string): Item[] {
  const parsed: unknown = JSON.parse(jsonText);
  if (!isNode(parsed)) return [];
  const items: Item[] = [];
  collectSnippets(parsed, '', file, items);
  return items;
}

interface ParsedSnippet {
  plurals: number;
  placeholders: string[];
}

function parseSnippetSignature(signature: string): ParsedSnippet {
  let plurals = 1;
  let placeholders: string[] = [];
  for (const part of signature.split(' ')) {
    if (part.startsWith('plurals=')) {
      const parsed = Number(part.slice('plurals='.length));
      if (Number.isInteger(parsed) && parsed > 1) plurals = parsed;
    } else if (part.startsWith('placeholders=')) {
      placeholders = part
        .slice('placeholders='.length)
        .split(',')
        .filter((name) => name !== '');
    }
  }
  return { plurals, placeholders };
}

/** Reports breaking snippet contract changes: removed/renamed placeholders or
 *  fewer plural branches. Plain wording edits return undefined. */
export function snippetChange(before: string, after: string): string | undefined {
  if (before === after) return undefined;
  const prev = parseSnippetSignature(before);
  const next = parseSnippetSignature(after);
  const notes: string[] = [];
  const prevJoined = prev.placeholders.join(',');
  const nextJoined = next.placeholders.join(',');
  if (prevJoined !== nextJoined) {
    notes.push(`placeholders {${prevJoined || '-'}} → {${nextJoined || '-'}}`);
  }
  if (next.plurals < prev.plurals) {
    notes.push(`plurals ${prev.plurals} → ${next.plurals}`);
  }
  return notes.length === 0 ? undefined : notes.join(', ');
}
