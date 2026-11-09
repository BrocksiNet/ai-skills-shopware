// Release names and runs of them: which releases a range allows, and the
// `first … last` runs a fact holds in.
import { parseConstraint } from './constraint.ts';
import { compareReleases, type Timeline } from './timeline.ts';

/** Releases of the timeline in the range, oldest first. Trunk is never in a range. */
export function releasesIn(timeline: Timeline, constraint: string): string[] {
  const test = parseConstraint(constraint);
  if (test === undefined) throw new Error(`cannot read the version constraint "${constraint}"`);
  return timeline.releases.map((release) => release.release).filter((name) => test(name));
}

/** Collapses release indexes into `[first, last]` runs within the range. */
export function runs(indexes: number[], inRange: number[], names: string[]): [string, string][] {
  const out: [string, string][] = [];
  let start: number | undefined;
  let last: number | undefined;
  for (const index of inRange) {
    const hit = indexes.includes(index);
    if (hit && start === undefined) start = index;
    if (!hit && start !== undefined) {
      out.push([names[start] ?? '', names[last ?? start] ?? '']);
      start = undefined;
    }
    last = index;
  }
  if (start !== undefined) out.push([names[start] ?? '', names[last ?? start] ?? '']);
  return out;
}

/** `6.6.0.0 … 6.6.10.29` or a single release. */
export function formatRuns(releases: [string, string][]): string {
  return releases.map(([first, last]) => (first === last ? first : `${first} … ${last}`)).join(', ');
}

export function sortReleases(names: string[]): string[] {
  return names.toSorted(compareReleases);
}

/** The release names of `[first, last]` runs, in range order. */
export function expand(spans: [string, string][], releases: string[]): string[] {
  return spans.flatMap(([first, last]) => releases.slice(releases.indexOf(first), releases.indexOf(last) + 1));
}

/** Collapses release names back into `[first, last]` runs of the range. */
export function collapse(names: string[], releases: string[]): [string, string][] {
  const out: [string, string][] = [];
  let previous = -2;
  for (const index of names.map((name) => releases.indexOf(name)).toSorted((a, b) => a - b)) {
    const run = out.at(-1);
    if (run !== undefined && index === previous + 1) run[1] = releases[index] ?? run[1];
    else out.push([releases[index] ?? '', releases[index] ?? '']);
    previous = index;
  }
  return out;
}
