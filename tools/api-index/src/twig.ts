// What a Twig template offers an extension: its blocks, the template it
// extends, and in admin templates the slots and literal position
// identifiers. Each block carries a hash of its body, so a release that
// reworks the markup an override sits on shows up. Core marks a block it
// will remove with a comment right above it, `{# @deprecated tag:v6.8.0 -
// … #}`; a template whose first content is such a comment is deprecated as
// a whole.
import { createHash } from 'node:crypto';

export interface TwigBlock {
  name: string;
  /** The block it sits in, or undefined at the top level. */
  parent?: string;
  /** The removal version from the comment above it ('' without a tag). */
  deprecated?: string;
  /** 1-based line of the `{% block %}` tag. */
  line: number;
  /** Hash of the body: comments dropped, whitespace collapsed, each child
   *  block reduced to its name, so a change inside a child does not count
   *  for the parent. Undefined for a block that is never closed. */
  body?: string;
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

/** An open block: where its tag starts, where its body starts, and the
 *  children closed inside it so far. */
interface Frame {
  block: TwigBlock;
  tagStart: number;
  bodyStart: number;
  children: { from: number; to: number; name: string }[];
}

/** Eight base64url characters of the SHA-1 of the normalised body:
 *  no comments, and whitespace only where it separates words. */
export function bodyHash(text: string): string {
  const normal = text
    .replace(/\{#[\s\S]*?#\}/gu, '')
    .replace(/\s+/gu, ' ')
    // Indentation and line breaks between tags are layout, not markup.
    .replace(/ ?([<>]|\{[%{]|[%}]\}) ?/gu, '$1')
    .trim();
  return createHash('sha1').update(normal).digest('base64url').slice(0, 8);
}

function bodyOf(source: string, frame: Frame, end: number): string {
  let text = '';
  let at = frame.bodyStart;
  for (const child of frame.children) {
    text += `${source.slice(at, child.from)}{% block ${child.name} %}`;
    at = child.to;
  }
  return text + source.slice(at, end);
}

export function scanTwig(source: string): TwigFile {
  const file: TwigFile = { blocks: [], positions: [], slots: [] };
  const stack: Frame[] = [];
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
        if (parent !== undefined) block.parent = parent.block.name;
        if (pending !== undefined) block.deprecated = pending;
        file.blocks.push(block);
        // `{% block x 'inline' %}` closes itself; its body is the expression.
        if (rest.trim() === name) stack.push({ block, tagStart: match.index, bodyStart: last, children: [] });
        else {
          block.body = bodyHash(rest.trim().slice(name.length));
          parent?.children.push({ from: match.index, to: last, name });
        }
      }
    } else if (tag === 'endblock') {
      const frame = stack.pop();
      if (frame !== undefined) {
        frame.block.body = bodyHash(bodyOf(source, frame, match.index));
        stack.at(-1)?.children.push({ from: frame.tagStart, to: last, name: frame.block.name });
      }
    } else if (tag === 'sw_extends' || tag === 'extends') {
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
