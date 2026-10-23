// The review section of the weekly drift issue (plan WP12 step 3): the
// review signals of PRs merged in the week, counted per skill and rule or
// reference. The comments themselves stay in the `review-signals` release;
// the issue only says where to look.
import { type MapIndex, mapSignals } from './map-signal.ts';
import { readStore } from './review-store.ts';
import type { Signal, SignalMap } from './signals.ts';
import { compareText } from './text.ts';

/** How far back the issue looks: one week before the report's end. */
export const REVIEW_DAYS = 7;
const MAX_PRS = 5;

export interface ReviewWeek {
  from: string;
  to: string;
  signals: Signal[];
}

const DAY_MS = 24 * 60 * 60 * 1000;
const iso = (ms: number): string => new Date(ms).toISOString().replace(/\.[0-9]{3}Z$/u, 'Z');

/** The signals of PRs merged in the `REVIEW_DAYS` up to `to`. A bare day
 *  means the end of that day. */
export function reviewWeek(all: Signal[], to: string): ReviewWeek {
  const end = Date.parse(to.length === 10 ? `${to}T23:59:59Z` : to);
  const start = end - REVIEW_DAYS * DAY_MS;
  const inWeek = (s: Signal): boolean => {
    const t = Date.parse(s.pr?.merged_at ?? s.date);
    return t > start && t <= end;
  };
  return { from: iso(start + 1000), to: iso(end), signals: all.filter((s) => inWeek(s)) };
}

/** The week of a review-signals store, mapped again with today's rules.
 *  The issue is public, so `hidden` sources (the private ones) never show,
 *  even when a local cache holds them. */
export const storedReviewWeek = (dir: string, index: MapIndex, to: string, hidden: string[]): ReviewWeek =>
  reviewWeek(
    mapSignals(
      readStore(dir).filter((s) => !hidden.includes(s.source)),
      index,
    ),
    to,
  );

const what = (m: SignalMap): string => {
  if (m.reference !== undefined) return `\`${m.reference}\``;
  const [rule] = m.rules;
  return rule === undefined ? 'No rule yet' : `\`${rule}\``;
};

interface Row {
  skill: string;
  what: string;
  signals: Signal[];
}

function prLinks(signals: Signal[]): string {
  const prs = new Map<string, string>();
  for (const s of signals) {
    if (s.pr === undefined) continue;
    const key = `${s.repo}#${s.pr.number}`;
    if (!prs.has(key)) prs.set(key, `[#${s.pr.number}](https://github.com/${s.repo}/pull/${s.pr.number})`);
  }
  const links = [...prs.values()];
  const more = links.length > MAX_PRS ? `, +${links.length - MAX_PRS}` : '';
  return `${links.slice(0, MAX_PRS).join(', ')}${more}`;
}

const outdated = (signals: Signal[]): number => signals.filter((s) => s.thread?.outdated === true).length;
const row = (skill: string, label: string, signals: Signal[]): string =>
  `| ${skill} | ${label} | ${signals.length} | ${outdated(signals)} | ${prLinks(signals)} |`;

/** The issue section; empty when the store had nothing for the week. */
export function renderReviewSection(week: ReviewWeek): string[] {
  if (week.signals.length === 0) return [];
  const rows = new Map<string, Row>();
  for (const s of week.signals) {
    for (const m of s.map) {
      const key = `${m.skill}\n${what(m)}`;
      const r = rows.get(key) ?? { skill: m.skill, what: what(m), signals: [] };
      if (!r.signals.includes(s)) r.signals.push(s);
      rows.set(key, r);
    }
  }
  const unmapped = week.signals.filter((s) => s.map.length === 0);
  const prs = new Set(week.signals.map((s) => `${s.repo}#${s.pr?.number ?? 0}`)).size;
  const sources = [...new Set(week.signals.map((s) => `\`${s.source}\``))].toSorted(compareText).join(', ');
  return [
    '## Review comments',
    '',
    `${week.signals.length} review comment(s) and review(s) on ${prs} PR(s) merged ${week.from.slice(0, 10)} to ` +
      `${week.to.slice(0, 10)} (${sources}), mapped with today's rules. The text and each reviewer's trust ` +
      'score are in the `review-signals` release. Outdated means the code changed after the comment.',
    '',
    '| Skill | Rule or reference | Comments | Outdated | PRs |',
    '| ----- | ----------------- | -------- | -------- | --- |',
    ...[...rows.values()]
      .toSorted((a, b) => b.signals.length - a.signals.length || compareText(a.skill, b.skill))
      .map((r) => row(`\`${r.skill}\``, r.what, r.signals)),
    ...(unmapped.length === 0 ? [] : [row('Unmapped', '', unmapped)]),
  ];
}
