// The per-skill checks and the conflict checks of validate-skills: pure
// functions over SKILL.md and REGISTRY.md text.
import { compareText } from './text.ts';

export interface Frontmatter {
  name: string;
  description: string;
}

const FOLDED = new Set(['>-', '>', '|', '|-', '']);
/** A top-level key ends a folded description. */
const KEY = /^[A-Za-z0-9_-]+:(?:\s|$)/u;

/** One leading and one trailing quote off a trimmed value. */
const unquote = (value: string): string => value.trim().replace(/^["']/u, '').replace(/["']$/u, '');

/** `name` and `description` from the frontmatter. A folded description is
 *  joined into one line, the way the providers load it. */
export function frontmatter(markdown: string): Frontmatter {
  const lines = markdown.split('\n');
  const result: Frontmatter = { name: '', description: '' };
  if (lines[0] !== '---') return result;
  const body = lines.slice(1);
  const end = body.findIndex((l) => l.startsWith('---'));
  const fm = end === -1 ? body : body.slice(0, end);

  const name = fm.find((l) => l.startsWith('name:'));
  if (name !== undefined) result.name = unquote(name.slice('name:'.length));

  const start = fm.findIndex((l) => l.startsWith('description:'));
  if (start === -1) return result;
  const first = fm[start]?.slice('description:'.length).trim() ?? '';
  const rest = fm.slice(start + 1);
  const stop = rest.findIndex((l) => KEY.test(l));
  const folded = (stop === -1 ? rest : rest.slice(0, stop)).map((l) => l.trimStart());
  result.description = [...(FOLDED.has(first) ? [] : [first]), ...folded].join(' ').trim();
  return result;
}

/** Characters, not UTF-16 units, as the 1024 budget counts them. */
export const textLength = (text: string): number => Array.from(text).length;

export const lineCount = (text: string): number => text.split('\n').length - 1;

/** Targets of real `](references/x.md)` links, sorted and unique. Prose
 *  mentions of another skill's references do not count. */
export function referenceLinks(markdown: string): string[] {
  const links = Array.from(markdown.matchAll(/\]\((references\/[A-Za-z0-9_./-]+\.md)\)/gu), (m) => m[1] ?? '');
  return [...new Set(links)].toSorted(compareText);
}

/** The double-quoted trigger phrases of a description. */
export const triggerPhrases = (description: string): string[] =>
  Array.from(description.matchAll(/"([^"]+)"/gu), (m) => m[1] ?? '');

/** The same trigger phrase claimed by two skills. */
export function overlapErrors(phrases: Map<string, string[]>): string[] {
  const owners = new Map<string, Set<string>>();
  for (const [skill, list] of phrases) {
    for (const p of list) owners.set(p, (owners.get(p) ?? new Set<string>()).add(skill));
  }
  return [...owners]
    .filter(([, skills]) => skills.size > 1)
    .toSorted(([a], [b]) => compareText(a, b))
    .map(
      ([p, skills]) => `overlapping trigger phrase "${p}" claimed by: ${[...skills].toSorted(compareText).join(' ')}`,
    );
}

/** Topics listed twice in the REGISTRY.md coverage matrix. */
export function registryDuplicates(registry: string): string[] {
  const topics: string[] = [];
  let inMatrix = false;
  for (const line of registry.split('\n')) {
    if (line.startsWith('## ')) inMatrix = line.startsWith('## Coverage matrix');
    else if (inMatrix && line.startsWith('| ') && !line.includes('Topic') && !/^\|[ -]+\|/u.test(line)) {
      const topic = line.split('|')[1]?.trim() ?? '';
      if (topic !== '') topics.push(topic);
    }
  }
  const dups = new Set(topics.filter((t, i) => topics.indexOf(t) !== i));
  return [...dups].toSorted(compareText);
}
