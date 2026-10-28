// The issue side of `suggest-rules` in CI (.github/workflows/suggest-rules.yml):
// the weekly comment with the ranked proposals on the drift issue, the
// `/draft <id>` command a maintainer answers with, and the run whose
// `suggestions` artifact holds that proposal.

/** Hidden line that ties a proposals comment to the run that wrote it. */
export const RUN_MARKER = 'suggest-rules-run';
/** Only comments by this account can point at a run. */
export const BOT_LOGIN = 'github-actions[bot]';
export const DRAFT_AGENTS = ['copilot', 'opencode'] as const;
export type DraftAgent = (typeof DRAFT_AGENTS)[number];

/** GitHub refuses comments over 65536 characters. */
const MAX_COMMENT = 60_000;

export interface CommentInput {
  /** `suggestions/<date>.md` as `suggest-rules` wrote it. */
  markdown: string;
  runId: string;
  runUrl: string;
}

/** The summary and ranked table of a suggestions file, without the long
 *  per-proposal sections, plus how to draft one. */
export function proposalsComment(c: CommentInput): string {
  const cut = c.markdown.indexOf('\n## ');
  let head = (cut === -1 ? c.markdown : c.markdown.slice(0, cut)).trimEnd();
  const footer = [
    '',
    'Comment `/draft <ID>` to draft a proposal whose action is not `none` and whose checks are `ok`. The',
    'agent writes the rule, its eval and golden fixtures, runs the free checks and the A/B, and opens a',
    'draft PR. Add `opencode` after the ID to draft with the free model instead of Copilot.',
    '',
    `Each proposal's draft text, criteria and evidence: the \`suggestions\` artifact of ${c.runUrl}.`,
    '',
    `<!-- ${RUN_MARKER}: ${c.runId} -->`,
  ].join('\n');
  if (head.length + footer.length > MAX_COMMENT) {
    const rows = head.slice(0, MAX_COMMENT - footer.length - 200);
    head = `${rows.slice(0, rows.lastIndexOf('\n'))}\n\nThe table is cut here; the artifact has every row.`;
  }
  return `${head.replace(/^# /u, '## ')}\n${footer}\n`;
}

export interface DraftCommand {
  id: string;
  agent: DraftAgent;
}

/** `/draft 2026-10-26-04` or `/draft 2026-10-26-04 opencode` on the first
 *  line, else an error message. */
export function parseDraftCommand(comment: string): DraftCommand | string {
  const line = (comment.split('\n')[0] ?? '').trim();
  const m = /^\/draft\s+(\d{4}-\d{2}-\d{2}-\d{2,3})(?:\s+(\S+))?$/u.exec(line);
  if (m === null) return 'usage: /draft <proposal ID> [copilot|opencode], for example /draft 2026-10-26-04';
  const agent = m[2] ?? 'copilot';
  const known = DRAFT_AGENTS.find((a) => a === agent);
  if (known === undefined) return `unknown agent ${agent}; use ${DRAFT_AGENTS.join(' or ')}`;
  return { id: m[1] ?? '', agent: known };
}

export interface IssueComment {
  body: string;
  login: string;
}

/** The run of the newest bot comment whose table lists `id`, or undefined. */
export function runFor(id: string, comments: IssueComment[]): string | undefined {
  const marker = new RegExp(`<!-- ${RUN_MARKER}: (\\d+) -->`, 'u');
  // An ID is digits and dashes (parseDraftCommand), so it needs no escaping.
  if (!/^[\d-]+$/u.test(id)) return undefined;
  const listed = new RegExp(`\\|\\s*${id}\\s*\\|`, 'u');
  for (const c of comments.toReversed()) {
    if (c.login !== BOT_LOGIN) continue;
    const m = marker.exec(c.body);
    if (m !== null && listed.test(c.body)) return m[1];
  }
  return undefined;
}

/** JSON lines of `{"body": …, "login": …}`, as the workflow's `gh api --jq`
 *  prints them; other lines are skipped. */
export function parseComments(text: string): IssueComment[] {
  const out: IssueComment[] = [];
  for (const line of text.split('\n')) {
    if (line.trim() === '') continue;
    let v: unknown;
    try {
      v = JSON.parse(line);
    } catch {
      continue;
    }
    if (typeof v !== 'object' || v === null || !('body' in v) || !('login' in v)) continue;
    if (typeof v.body === 'string' && typeof v.login === 'string') out.push({ body: v.body, login: v.login });
  }
  return out;
}
