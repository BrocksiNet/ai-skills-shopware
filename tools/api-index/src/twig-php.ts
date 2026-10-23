// The Twig functions, filters and tags core adds: `new TwigFunction('…')`,
// `new TwigFilter('…')` and the `getTag()` of a token parser. A name is
// deprecated when a `@deprecated` comment sits in the lines right above it
// (and after the name before it), or on the class.
import type { Flags, Item } from './model.ts';

const DECLARED = /new\s+Twig(Function|Filter)\(\s*'([\w.]+)'/gu;
const TAG = /function\s+getTag\(\)[^{]*\{\s*return\s+'(\w+)'/u;

/** The removal version of the nearest `@deprecated` in `text` ('' without a tag). */
function deprecatedNote(text: string): string | undefined {
  const notes = [...text.matchAll(/@deprecated\b([^\n]*)/gu)];
  const note = notes.at(-1)?.[1];
  if (note === undefined) return undefined;
  const parts = /tag:v?(\d+)\.(\d+)\.(\d+)/u.exec(note);
  return parts === null ? '' : `v${parts[1]}.${parts[2]}.${parts[3]}`;
}

/** Twig names a PHP file declares. */
export function twigItems(code: string, file: string): Item[] {
  const classAt = code.search(/^(?:final\s+|abstract\s+|readonly\s+)*class\s/mu);
  const classNote = classAt < 0 ? undefined : deprecatedNote(code.slice(Math.max(0, classAt - 600), classAt));
  let previous = 0;
  const flagsAt = (at: number): Flags => {
    const lines = code.slice(previous, at).split('\n').slice(-4).join('\n');
    const deprecated = deprecatedNote(lines) ?? classNote;
    return deprecated === undefined ? {} : { deprecated };
  };
  const items: Item[] = [];
  for (const match of code.matchAll(DECLARED)) {
    const kind = match[1] === 'Function' ? 'function' : 'filter';
    items.push({ id: `twig:${kind}:${match[2]}`, kind: 'twig', file, signature: kind, flags: flagsAt(match.index) });
    previous = match.index + match[0].length;
  }
  previous = 0;
  const tag = TAG.exec(code);
  if (tag?.[1] !== undefined && /TokenParser/u.test(code)) {
    items.push({ id: `twig:tag:${tag[1]}`, kind: 'twig', file, signature: 'tag', flags: flagsAt(tag.index) });
  }
  return items;
}
