// What a Twig template offers an extension: its blocks, the template it
// extends, and in admin templates the slots and literal position
// identifiers. Core marks a block it will remove with a comment right above
// it, `{# @deprecated tag:v6.8.0 - … #}`; a template whose first content is
// such a comment is deprecated as a whole.

export interface TwigBlock {
  name: string;
  /** The block it sits in, or undefined at the top level. */
  parent?: string;
  /** The removal version from the comment above it ('' without a tag). */
  deprecated?: string;
  /** 1-based line of the `{% block %}` tag. */
  line: number;
}

export interface TwigFile {
  blocks: TwigBlock[];
  /** `{% sw_extends '…' %}` or `{% extends '…' %}`. */
  extends?: string;
  /** Deprecated from its first content on. */
  deprecated?: string;
  /** `position-identifier="…"` values written as literals. */
  positions: string[];
  /** `<slot name="…">` names; `default` for a slot without one. */
  slots: string[];
}

const TOKEN = /\{#([\s\S]*?)#\}|\{%-?\s*(\w+)\s*([^%]*?)\s*-?%\}/gu;

function deprecation(comment: string): string | undefined {
  if (!/@deprecated\b/u.test(comment)) return undefined;
  const parts = /tag:v?(\d+)\.(\d+)\.(\d+)/u.exec(comment);
  return parts === null ? '' : `v${parts[1]}.${parts[2]}.${parts[3]}`;
}

/** The 1-based line of an offset. */
export function lineAt(source: string, offset: number): number {
  let line = 1;
  for (let at = source.indexOf('\n'); at !== -1 && at < offset; at = source.indexOf('\n', at + 1)) line += 1;
  return line;
}

function quoted(text: string): string | undefined {
  return /^['"]([^'"]+)['"]/u.exec(text)?.[1];
}

export function scanTwig(source: string): TwigFile {
  const file: TwigFile = { blocks: [], positions: [], slots: [] };
  const stack: string[] = [];
  let pending: string | undefined;
  let seenContent = false;
  let last = 0;
  for (const match of source.matchAll(TOKEN)) {
    const between = source.slice(last, match.index);
    last = match.index + match[0].length;
    if (between.trim() !== '') {
      pending = undefined;
      seenContent = true;
    }
    const [, comment, tag = '', rest = ''] = match;
    if (comment !== undefined) {
      const found = deprecation(comment);
      if (found !== undefined && !seenContent) file.deprecated = found;
      pending = found;
      continue;
    }
    if (tag === 'block') {
      const name = /^(\w+)/u.exec(rest)?.[1];
      if (name !== undefined) {
        const block: TwigBlock = { name, line: lineAt(source, match.index) };
        const parent = stack.at(-1);
        if (parent !== undefined) block.parent = parent;
        if (pending !== undefined) block.deprecated = pending;
        file.blocks.push(block);
        // `{% block x 'inline' %}` closes itself.
        if (rest.trim() === name) stack.push(name);
      }
    } else if (tag === 'endblock') stack.pop();
    else if (tag === 'sw_extends' || tag === 'extends') {
      const parent = quoted(rest.trim());
      if (parent !== undefined) file.extends = parent;
    }
    pending = undefined;
    if (tag !== 'sw_extends' && tag !== 'extends') seenContent = true;
  }
  for (const match of source.matchAll(/(?<![:\w-])position-identifier="([^"{}]+)"/gu)) {
    if (match[1] !== undefined) file.positions.push(match[1]);
  }
  for (const match of source.matchAll(/<slot\b([^>]*)>/gu)) {
    file.slots.push(/(?<![:\w-])name="([^"]+)"/u.exec(match[1] ?? '')?.[1] ?? 'default');
  }
  file.positions = [...new Set(file.positions)];
  file.slots = [...new Set(file.slots)];
  return file;
}
