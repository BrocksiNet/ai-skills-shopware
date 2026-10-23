// The weekly drift issue (plan WP8, WP12): `.github/workflows/mine-trunk.yml`
// opens or updates the issue of the week and closes the older ones a new
// report fully covers. `planIssue` decides, `publishIssue` carries it out;
// a dry run prints the plan instead.
import { writeFileSync } from 'node:fs';
import { allPages, type GitHubApi, type GitHubWrite } from './github.ts';
import { stateFromReport } from './mine-report.ts';
import { report as mine, type ReportOptions } from './mine-run.ts';
import { type MiningStates, readsFurther } from './mine-trunk.ts';
import { inSeries } from './series.ts';

export const ISSUE_LABEL = 'trunk-drift';
/** An issue body holds 65536 characters; stay clear of it. */
export const BODY_LIMIT = 60_000;
const CUT_AT = 58_000;

export interface OpenIssue {
  number: number;
  title: string;
  body: string;
}

export interface Superseded {
  number: number;
  comment: string;
}

export interface Kept {
  number: number;
  why: string;
}

export interface IssuePlan {
  title: string;
  body: string;
  /** The open issue of this week, updated in place; none: create one. */
  update?: number;
  close: Superseded[];
  /** Older open issues the report does not fully cover. */
  keep: Kept[];
}

/** "Drift: week of <Monday>", in UTC. */
export function weekTitle(now: Date): string {
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
  return `Drift: week of ${monday.toISOString().slice(0, 10)}`;
}

/** The report as an issue body: cut at a line end when too long, with a
 *  pointer to the full report and the state marker kept. */
export function issueBody(report: string, runUrl?: string): string {
  if (report.length <= BODY_LIMIT) return report;
  const marker = report.split('\n').find((l) => l.startsWith('<!-- mine-trunk-state: ')) ?? '';
  const head = report.slice(0, CUT_AT);
  const cut = head.slice(0, Math.max(head.lastIndexOf('\n'), 0));
  const where =
    runUrl === undefined ? 'the `trunk-drift` artifact of the run' : `the \`trunk-drift\` artifact of ${runUrl}`;
  return `${cut}\n\nThe report is cut here. The full report is ${where}.\n\n${marker}\n`;
}

/** Why `newer` does not cover everything `older` lists; undefined when it
 *  does. A report reads from the current state, so it covers an older one
 *  when it reaches at least as far in every source the older one read. */
export function notCovered(newer: MiningStates, older: MiningStates): string | undefined {
  const gaps = Object.entries(older).flatMap(([id, state]) => {
    const next = newer[id];
    if (next === undefined) return [`${id} is not in the new report`];
    return readsFurther(state, next) ? [`${id} ends earlier in the new report`] : [];
  });
  return gaps.length === 0 ? undefined : gaps.join('; ');
}

const markerOf = (body: string): MiningStates | undefined => {
  try {
    return stateFromReport(body);
  } catch {
    return undefined;
  }
};

/** What to do with the open drift issues for a new report. */
export function planIssue(open: OpenIssue[], report: string, now: Date, runUrl?: string): IssuePlan {
  const title = weekTitle(now);
  const states = stateFromReport(report);
  const current = open.find((i) => i.title === title);
  const plan: IssuePlan = { title, body: issueBody(report, runUrl), close: [], keep: [] };
  if (current !== undefined) plan.update = current.number;
  const by = current === undefined ? 'the new issue' : `#${current.number}`;
  for (const issue of open.filter((i) => i !== current).toSorted((a, b) => a.number - b.number)) {
    const older = markerOf(issue.body);
    const why = older === undefined ? 'it has no state marker' : notCovered(states, older);
    if (why === undefined)
      plan.close.push({ number: issue.number, comment: `Superseded by ${by}, which covers this window too.` });
    else plan.keep.push({ number: issue.number, why });
  }
  return plan;
}

type Json = Record<string, unknown>;
const isRecord = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v);

/** The open drift issues of `repo`, pull requests left out. */
export async function openIssues(api: GitHubApi, repo: string): Promise<OpenIssue[]> {
  const items = await allPages(api, `repos/${repo}/issues?labels=${ISSUE_LABEL}&state=open`);
  return items.flatMap((i) =>
    isRecord(i) && typeof i.number === 'number' && typeof i.title === 'string' && i.pull_request === undefined
      ? [{ number: i.number, title: i.title, body: typeof i.body === 'string' ? i.body : '' }]
      : [],
  );
}

/** The plan as text, for a dry run and the job log. */
export function describePlan(plan: IssuePlan): string {
  return [
    plan.update === undefined ? `create issue "${plan.title}"` : `update #${plan.update} "${plan.title}"`,
    ...plan.close.map((c) => `close #${c.number} as superseded`),
    ...plan.keep.map((k) => `keep #${k.number} open: ${k.why}`),
  ]
    .map((l) => `${l}\n`)
    .join('');
}

/** Carries the plan out; returns the number of this week's issue. */
export async function publishIssue(api: GitHubApi, write: GitHubWrite, repo: string, plan: IssuePlan): Promise<number> {
  const label = await api(`repos/${repo}/labels/${ISSUE_LABEL}`).then(
    () => true,
    () => false,
  );
  if (!label) {
    await write('POST', `repos/${repo}/labels`, {
      name: ISSUE_LABEL,
      color: 'D93F0B',
      description: 'Weekly drift mining report (mine-trunk.yml)',
    });
  }
  let number = plan.update;
  if (number === undefined) {
    const created = await write('POST', `repos/${repo}/issues`, {
      title: plan.title,
      body: plan.body,
      labels: [ISSUE_LABEL],
    });
    if (!isRecord(created) || typeof created.number !== 'number') throw new Error('GitHub API: no issue number');
    number = created.number;
  } else {
    await write('PATCH', `repos/${repo}/issues/${number}`, { body: plan.body });
  }
  const current = number;
  await inSeries(plan.close, async (c) => {
    await write('POST', `repos/${repo}/issues/${c.number}/comments`, {
      body: c.comment.replace('the new issue', `#${current}`),
    });
    await write('PATCH', `repos/${repo}/issues/${c.number}`, { state: 'closed', state_reason: 'not_planned' });
  });
  return current;
}

export interface RunOptions extends ReportOptions {
  /** `owner/name` the drift issue lives in. */
  repo?: string;
  /** Needed unless `dryRun`. */
  write?: GitHubWrite;
  /** Mine and plan, but leave the issues and the state file alone. */
  dryRun?: boolean;
  /** Also write the full report here, for the workflow artifact. */
  out?: string;
  /** Link to the run, for a report cut to fit an issue. */
  runUrl?: string;
}

/** `report`, then open or update the week's issue and close the ones it
 *  supersedes. Returns the log: the plan, and in a dry run the report
 *  first. The state file is never written here; only `/mined` moves it. */
export async function run(o: RunOptions): Promise<string> {
  const text = await mine(o);
  const now = o.now === undefined ? new Date() : new Date(o.now);
  if (o.out !== undefined) writeFileSync(o.out, text);
  if (o.dryRun === true) {
    const plan =
      o.repo === undefined
        ? 'No --repo: the issue plan is skipped.\n'
        : describePlan(planIssue(await openIssues(o.api, o.repo), text, now, o.runUrl));
    return `${text}\n---\nDry run, nothing written. Issue plan:\n${plan}`;
  }
  if (o.repo === undefined || o.write === undefined) throw new Error('publishing needs a repo and a GitHub token');
  const plan = planIssue(await openIssues(o.api, o.repo), text, now, o.runUrl);
  const number = await publishIssue(o.api, o.write, o.repo, plan);
  return `issue #${number}\n${describePlan(plan)}`;
}
