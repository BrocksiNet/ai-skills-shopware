// What an extension can use instead of a block a release no longer has:
// the blocks its template or component still has there, and core's
// template at that release, so the parent block's markup is one fetch away.
import type { Lookup } from './facts.ts';
import type { ReportFact } from './report.ts';
import { expand } from './runs.ts';

const CORE_RAW = 'https://raw.githubusercontent.com/shopware/shopware';

/** A block the template or component has in every release a block is missing in. */
export interface Nearby {
  name: string;
  /** Present in every release of the range, so one override can serve the whole range. */
  throughout: boolean;
}

/** core's template of a missing block at the first release it is missing
 *  in: the file of a block its owner still has there. */
function sourceUrl(lookup: Lookup, fact: ReportFact): string | undefined {
  const hash = fact.target.indexOf('#');
  const first = fact.releases[0]?.[0];
  const index = first === undefined ? -1 : lookup.names.indexOf(first);
  const ref = lookup.timeline.releases[index]?.ref;
  if (hash === -1 || ref === undefined) return undefined;
  const file = lookup.blocks(fact.target.slice(0, hash)).find((item) => lookup.present(item, index))?.file;
  return file === undefined ? undefined : `${CORE_RAW}/${ref}/${file}`;
}

/** The blocks the owner of a missing block has in all the releases it is
 *  missing in, nearest by name: the ones sharing the longest `_` prefix
 *  with it. Those present in the whole range come first, then the shorter
 *  names (the parent block before its children), so a fix needs no look at
 *  core's source for a block to move the override to. */
function nearbyBlocks(lookup: Lookup, fact: ReportFact, releases: string[]): Nearby[] {
  const hash = fact.target.indexOf('#');
  if (hash === -1) return [];
  const missing = expand(fact.releases, releases).map((release) => lookup.names.indexOf(release));
  const whole = releases.map((release) => lookup.names.indexOf(release));
  const present = lookup
    .blocks(fact.target.slice(0, hash))
    .filter((item) => missing.every((index) => lookup.present(item, index)))
    .map((item) => ({
      name: item.id.slice(hash + 1),
      throughout: whole.every((index) => lookup.present(item, index)),
    }));
  const segments = fact.target.slice(hash + 1).split('_');
  for (let count = segments.length - 1; count >= 1; count -= 1) {
    const prefix = segments.slice(0, count).join('_');
    const near = present.filter((block) => block.name.startsWith(prefix));
    if (near.length > 0) {
      return near.toSorted(
        (a, b) =>
          Number(b.throughout) - Number(a.throughout) || a.name.length - b.name.length || a.name.localeCompare(b.name),
      );
    }
  }
  return [];
}

export function attachNearby(facts: ReportFact[], lookup: Lookup, releases: string[]): void {
  for (const fact of facts.filter((candidate) => candidate.kind === 'missing')) {
    const nearby = nearbyBlocks(lookup, fact, releases);
    if (nearby.length > 0) fact.nearby = nearby;
    const source = sourceUrl(lookup, fact);
    if (source !== undefined) fact.source = source;
  }
}
