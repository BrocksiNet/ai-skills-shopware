// The two commands behind tools/bin/mine-trunk.ts (plan WP8, WP12): `report`
// mines every source and renders the drift issue; `advance` writes the
// states a report recorded into docs/.mining-state.json.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadCatalog } from './catalog.ts';
import type { GitHubApi } from './github.ts';
import { renderReport, reportJsonLines, stateFromReport } from './mine-report.ts';
import {
  firstPass,
  type Mined,
  mineSource,
  type MiningStates,
  parseStates,
  STATE_PATH,
  windowAfter,
  windowOfDays,
} from './mine-trunk.ts';
import { storedReviewWeek } from './review-report.ts';
import { inSeries } from './series.ts';
import { mapIndex } from './map-signal.ts';
import { loadReviewSources, loadSources, type Source } from './sources.ts';

export interface ReportOptions {
  root: string;
  api: GitHubApi;
  /** Both or neither: whole days, inclusive. Default: after each state. */
  since?: string;
  until?: string;
  /** Only this source. */
  source?: string;
  /** Also write the mapped signals as JSON Lines here. */
  signals?: string;
  /** A review-signals store: adds the review comments of the week up to
   *  the report's end, mapped again with today's rules. */
  reviews?: string;
  /** End of the window when it follows the state; tests fix it. */
  now?: string;
}

export function readStates(root: string): MiningStates {
  const path = join(root, STATE_PATH);
  return existsSync(path) ? parseStates(JSON.parse(readFileSync(path, 'utf8'))) : {};
}

function mine(o: ReportOptions, source: Source, states: MiningStates, to: string): Promise<Mined> {
  if (o.since !== undefined && o.until !== undefined) return mineSource(o.api, source, windowOfDays(o.since, o.until));
  if (o.since !== undefined || o.until !== undefined) throw new Error('--since and --until go together');
  const state = states[source.id];
  return state === undefined ? firstPass(o.api, source, to) : mineSource(o.api, source, windowAfter(state, to));
}

/** The issue body for every source, or the one `o.source` names. */
export async function report(o: ReportOptions): Promise<string> {
  const all = loadSources(o.root);
  const sources = o.source === undefined ? all : all.filter((s) => s.id === o.source);
  if (sources.length === 0) throw new Error(`unknown source ${o.source ?? ''}`);
  const states = readStates(o.root);
  const to = o.now ?? new Date().toISOString().replace(/\.[0-9]{3}Z$/u, 'Z');
  const mined = await inSeries(sources, (s) => mine(o, s, states, to));
  const catalog = loadCatalog(o.root);
  const index = mapIndex(o.root, catalog, all);
  if (o.signals !== undefined) writeFileSync(o.signals, reportJsonLines(mined, index));
  const end = o.until ?? to;
  const reviews =
    o.reviews === undefined
      ? undefined
      : storedReviewWeek(
          o.reviews,
          index,
          end,
          loadReviewSources(o.root)
            .filter((r) => r.private)
            .map((r) => r.id),
        );
  return renderReport(mined, catalog, index, reviews);
}

/** Merges the states a report recorded into the state file; sources the
 *  report did not cover keep theirs. Returns the merged states. */
export function advance(root: string, issueBody: string): MiningStates {
  const states = { ...readStates(root), ...stateFromReport(issueBody) };
  writeFileSync(join(root, STATE_PATH), `${JSON.stringify(states, null, 2)}\n`);
  return states;
}
