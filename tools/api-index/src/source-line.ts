// The line an item of the index sits on. The index stores files, not lines,
// so the line is looked up on demand in the file's text: the first line that
// declares or names the item. A lookup, not a parse: good enough to put an
// agent on the right line, and undefined rather than a wrong guess.

import type { ApiDiff } from './api-diff.ts';

const escape = (text: string): string => text.replaceAll(/[.*+?^${}()|[\]\\]/gu, '\\$&');

/** `{% block name %}` in Twig, with or without whitespace control. */
const twigBlock = (name: string): RegExp => new RegExp(`\\{%-?\\s*block\\s+${escape(name)}\\b`, 'u');
const quoted = (name: string): RegExp => new RegExp(`['"\`]${escape(name)}['"\`]`, 'u');
const word = (name: string): RegExp => new RegExp(`(?<![\\w$-])${escape(name)}(?![\\w-])`, 'u');

/** The patterns that find an item, most specific first. */
export function patternsFor(id: string): RegExp[] {
  const colon = id.indexOf(':');
  const prefix = id.slice(0, colon);
  const rest = id.slice(colon + 1);
  if (prefix === 'php') {
    const [fqcn = '', member] = rest.split('::');
    const short = fqcn.split('\\').at(-1) ?? fqcn;
    if (member === undefined) return [new RegExp(`\\b(class|interface|trait|enum)\\s+${escape(short)}\\b`, 'u')];
    if (member.endsWith('()')) return [new RegExp(`\\bfunction\\s+&?${escape(member.slice(0, -2))}\\s*\\(`, 'u')];
    if (member.startsWith('$')) return [new RegExp(`${escape(member)}\\b`, 'u')];
    return [new RegExp(`\\b(const|case)\\s+(\\w+\\s+)?${escape(member)}\\b`, 'u'), word(member)];
  }
  if (prefix === 'route' || prefix === 'entity') return [quoted(rest), word(rest)];
  if (prefix === 'field') {
    const property = rest.slice(rest.indexOf('.') + 1);
    return [quoted(property), word(property)];
  }
  if (prefix === 'twig') {
    const name = rest.slice(rest.indexOf(':') + 1);
    return [quoted(name), word(name)];
  }
  const hash = rest.lastIndexOf('#');
  if (hash !== -1) {
    const block = rest.slice(hash + 1);
    return [twigBlock(block), word(block)];
  }
  // admin:sw-x.prop.y, js-plugin:Name.option.y, config:shopware.a.b,
  // feature:NAME, admin:sw-x, storefront:@Storefront/…twig (line 1 below).
  const last = rest.split('.').at(-1) ?? rest;
  if (prefix === 'storefront' && rest.endsWith('.twig')) return [];
  const name = escape(last);
  // A method's definition, not the first call to it.
  if (rest.includes('.js-method.'))
    return [
      new RegExp(`^\\s*(static\\s+)?(async\\s+)?\\*?${name}\\s*\\([^)]*\\)\\s*\\{`, 'u'),
      new RegExp(`\\b${name}\\s*[:=]\\s*(async\\s*)?(function\\b|\\()`, 'u'),
      word(last),
    ];
  // A prop or option is a key of an object literal.
  if (rest.includes('.prop.') || rest.includes('.option.'))
    return [new RegExp(`^\\s*['"]?${name}['"]?\\s*:`, 'u'), quoted(last), word(last)];
  return [quoted(last), word(last)];
}

/** 1-based line of the item in `text`; 1 for a whole-file item such as a
 *  template; undefined when nothing matches. */
export function lineOf(id: string, text: string): number | undefined {
  const patterns = patternsFor(id);
  if (patterns.length === 0) return 1;
  const lines = text.split('\n');
  for (const pattern of patterns) {
    const index = lines.findIndex((line) => pattern.test(line));
    if (index !== -1) return index + 1;
  }
  return undefined;
}

/** Sets each change's line from the file text at the ref that has the item:
 *  the base for a removal, the head otherwise. `read` returns undefined for
 *  a file it cannot read. */
export function withLines(
  diff: ApiDiff,
  read: (ref: string, files: string[]) => Map<string, string>,
  lineOf: (id: string, text: string) => number | undefined,
): ApiDiff {
  const files = (removed: boolean): string[] => [
    ...new Set(diff.changes.filter((change) => (change.kind === 'removed') === removed).map((change) => change.file)),
  ];
  const atBase = read(diff.base, files(true));
  const atHead = read(diff.head, files(false));
  const changes = diff.changes.map((change) => {
    const text = (change.kind === 'removed' ? atBase : atHead).get(change.file);
    const line = text === undefined ? undefined : lineOf(change.id, text);
    return line === undefined ? change : { ...change, line };
  });
  return { ...diff, changes };
}
