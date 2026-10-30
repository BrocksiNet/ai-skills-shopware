// Totals and the plain-text report over many sessions, for
// tools/bin/skill-context.ts. The per-transcript counting is in
// skill-context.ts.
import { type ContextReport, skillTokens } from './skill-context.ts';

/** One session: the main transcript and its subagent transcripts. */
export interface Session {
  project: string;
  id: string;
  contexts: ContextReport[];
}

export interface SessionRow {
  project: string;
  session: string;
  input: number;
  listing: number;
  loads: number;
}

/** Totals per session over the main transcript and its subagents. */
export function sessionRow(session: Session): SessionRow {
  const row: SessionRow = { project: session.project, session: session.id, input: 0, listing: 0, loads: 0 };
  for (const context of session.contexts) {
    const t = skillTokens(context);
    row.input += context.inputTokens;
    row.listing += t.listing;
    row.loads += t.loads;
  }
  return row;
}

const millions = (n: number): string => `${(n / 1e6).toFixed(2)}M`;
const share = (n: number, of: number): string => (of === 0 ? '0%' : `${((n / of) * 100).toFixed(2)}%`);

function projectTable(rows: readonly SessionRow[]): string[] {
  const projects = new Map<string, { input: number; ours: number; sessions: number }>();
  for (const r of rows) {
    const p = projects.get(r.project) ?? { input: 0, ours: 0, sessions: 0 };
    p.input += r.input;
    p.ours += r.listing + r.loads;
    p.sessions += 1;
    projects.set(r.project, p);
  }
  return [
    'Project | sessions | input | ours | share',
    ...[...projects]
      .toSorted((a, b) => b[1].input - a[1].input)
      .map(
        ([name, p]) =>
          `${name} | ${p.sessions} | ${millions(p.input)} | ${millions(p.ours)} | ${share(p.ours, p.input)}`,
      ),
  ];
}

function skillTable(sessions: readonly Session[]): string[] {
  const perSkill = new Map<string, { loads: number; tokens: number; carried: number }>();
  for (const load of sessions.flatMap((s) => s.contexts.flatMap((c) => c.loads))) {
    const s = perSkill.get(load.skill) ?? { loads: 0, tokens: 0, carried: 0 };
    s.loads += 1;
    s.tokens += load.tokens;
    s.carried += load.tokens * load.requests;
    perSkill.set(load.skill, s);
  }
  if (perSkill.size === 0) return [];
  return [
    '',
    'Skill | loads | avg tokens per load | tokens carried',
    ...[...perSkill]
      .toSorted((a, b) => b[1].carried - a[1].carried)
      .map(([name, s]) => `${name} | ${s.loads} | ${Math.round(s.tokens / s.loads)} | ${millions(s.carried)}`),
  ];
}

/** The plain-text report the bin prints. */
export function formatReport(sessions: readonly Session[], days: number): string {
  const rows = sessions.map((s) => sessionRow(s));
  const total = (pick: (r: SessionRow) => number): number => rows.reduce((a, r) => a + pick(r), 0);
  const input = total((r) => r.input);
  const listing = total((r) => r.listing);
  const loads = total((r) => r.loads);
  return [
    `Sessions: ${rows.length} in the last ${days} days, ${rows.filter((r) => r.loads > 0).length} loaded our skills`,
    `Input tokens, all requests: ${millions(input)}`,
    `  our skill listing:        ${millions(listing)} (${share(listing, input)})`,
    `  our skill bodies + files: ${millions(loads)} (${share(loads, input)})`,
    '',
    ...projectTable(rows),
    ...skillTable(sessions),
    '',
  ].join('\n');
}
