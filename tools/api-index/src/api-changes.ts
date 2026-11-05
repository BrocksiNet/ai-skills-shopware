// What changed in Shopware's public API since the last index: trunk of the
// previous index against trunk of the new one, and each new release tag
// against the tag before it. Markdown for the run summary of api-index.yml
// and the `api-changes.md` asset the weekly drift issue reads.
import { type ApiDiff, diffSnapshots, diffSummary, diffText, isBreak, SURFACES } from './api-diff.ts';
import { compareReleases, snapshotAt, type Timeline, versionParts } from './timeline.ts';

/** The surfaces the report covers: all but PHP, which core's bc-check covers. */
const REPORTED = SURFACES.filter((surface) => surface !== 'php');

export interface Comparison {
  /** What is compared, in words: `trunk`, `6.7.2.0`. */
  title: string;
  diff: ApiDiff;
}

const short = (sha: string): string => sha.slice(0, 8);

const tags = (timeline: Timeline): string[] =>
  timeline.releases
    .map((release) => release.release)
    .filter((name) => versionParts(name) !== undefined)
    .toSorted(compareReleases);

function trunkComparison(previous: Timeline, current: Timeline): Comparison | undefined {
  const before = previous.releases.find((release) => release.release === 'trunk');
  const after = current.releases.find((release) => release.release === 'trunk');
  if (before === undefined || after === undefined || before.sha === after.sha) return undefined;
  const base = snapshotAt(previous, 'trunk');
  const head = snapshotAt(current, 'trunk');
  if (base === undefined || head === undefined) return undefined;
  const diff = diffSnapshots(base, head, REPORTED);
  return {
    title: 'trunk',
    diff: {
      ...diff,
      base: `trunk ${short(before.sha)} (${before.builtAt.slice(0, 10)})`,
      head: `trunk ${short(after.sha)} (${after.builtAt.slice(0, 10)})`,
    },
  };
}

/** Trunk since the previous index, then every tag the previous index did
 *  not have, each against the tag before it in the new index. */
export function comparisons(previous: Timeline | undefined, current: Timeline): Comparison[] {
  if (previous === undefined) return [];
  const out: Comparison[] = [];
  const trunk = trunkComparison(previous, current);
  if (trunk !== undefined) out.push(trunk);
  const known = new Set(tags(previous));
  const all = tags(current);
  for (const [index, tag] of all.entries()) {
    const before = all[index - 1];
    if (known.has(tag) || before === undefined) continue;
    const base = snapshotAt(current, before);
    const head = snapshotAt(current, tag);
    if (base === undefined || head === undefined) continue;
    out.push({ title: tag, diff: diffSnapshots(base, head, REPORTED) });
  }
  return out;
}

const count = (diff: ApiDiff, test: (kind: string, announced: boolean) => boolean): number =>
  diff.changes.filter((change) => test(change.kind, change.announced === true)).length;

/** The report as Markdown: a table with the counts, then each diff. */
export function changesMarkdown(previous: Timeline | undefined, current: Timeline): string {
  const lines = ['## Public API changes', ''];
  if (previous === undefined) {
    lines.push('No previous index to compare with, so nothing to report this week.');
    return `${lines.join('\n')}\n`;
  }
  if (previous.generator !== current.generator)
    lines.push(
      `The generator changed from ${previous.generator} to ${current.generator}. ` +
        'Some trunk changes below can come from the generator, not from Shopware.',
      '',
    );
  const found = comparisons(previous, current);
  if (found.length === 0) {
    lines.push('Trunk did not move and there is no new release tag since the previous index.');
    return `${lines.join('\n')}\n`;
  }
  lines.push(
    'Routes, entity fields, feature flags, configuration keys, admin, storefront, Twig and build surfaces. ' +
      "PHP signatures are left to core's bc-check.",
    '',
    '| Compared | Base → head | Breaking | After a deprecation | New deprecations |',
    '| -------- | ----------- | -------: | ------------------: | ---------------: |',
  );
  for (const { title, diff } of found) {
    const breaks = diff.changes.filter((change) => isBreak(change)).length;
    const announced = count(diff, (kind, done) => kind !== 'deprecated' && done);
    const deprecated = count(diff, (kind) => kind === 'deprecated');
    lines.push(`| ${title} | ${diff.base} → ${diff.head} | ${breaks} | ${announced} | ${deprecated} |`);
  }
  for (const { title, diff } of found) {
    if (diff.changes.length === 0) continue;
    lines.push(
      '',
      `<details><summary>${title}: ${diffSummary(diff).replace(/^Summary: /u, '')}</summary>`,
      '',
      '```text',
      diffText(diff).trimEnd(),
      '```',
      '',
      '</details>',
    );
  }
  return `${lines.join('\n')}\n`;
}
