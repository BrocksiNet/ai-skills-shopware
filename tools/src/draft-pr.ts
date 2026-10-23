// The pull request of `suggest-rules draft` (plan WP12 step 5): its body
// with the evidence, the criteria answers, the free checks and the A/B
// table read from the eval-local results file, and the `gh` call.
import { type CheckRun, type Exec, git } from './draft-checks.ts';
import { type AbResult, offDone, onDone } from './eval-results.ts';
import type { DraftSubject } from './draft-prompt.ts';
import { CRITERIA } from './suggest-schema.ts';

export const PR_LABEL = 'run-evals';

export interface AbSection {
  /** The eval-local results file, or undefined when no task changed. */
  file?: string;
  results: AbResult[];
  agent: string;
  model: string;
}

const cell = (text: string): string => text.replaceAll('|', '\\|').replaceAll('\n', ' ');

/** One row per task, straight from the results file. */
export function abTable(results: AbResult[]): string[] {
  return [
    '| Task | Skill on | Skill off | Verdict |',
    '| ---- | -------- | --------- | ------- |',
    ...results.map(
      (r) =>
        `| \`${r.task}\` | ${String(r.on)}/${String(onDone(r))} | ${String(r.off)}/${String(offDone(r))} | ${r.verdict} |`,
    ),
  ];
}

export function prTitle(s: DraftSubject, id: string): string {
  if (s.action === 'eval') return `test(${s.skill}): eval for ${s.rule}`;
  if (s.action === 'new') return `feat(${s.skill}): ${id} ${s.title}`;
  if (s.action === 'retire') return `chore(${s.skill}): retire ${s.rule}`;
  return `docs(${s.skill}): ${s.rule} ${s.title}`;
}

function abSection(ab: AbSection): string[] {
  if (ab.file === undefined) return ['No eval task changed, so there is no A/B.'];
  if (ab.results.length === 0) return [`The A/B wrote no results to \`${ab.file}\`.`];
  return [`\`eval-local\` with ${ab.agent} (${ab.model}); results file \`${ab.file}\`.`, '', ...abTable(ab.results)];
}

export interface PrBodyInput {
  suggestion: DraftSubject;
  /** The rule ID the change carries: the new one for `new`. */
  ruleId: string;
  files: string[];
  checks: CheckRun[];
  attempts: number;
  ab: AbSection;
}

function checksAndAb(x: PrBodyInput): string[] {
  return [
    '## Free checks',
    '',
    `Passed after ${String(x.attempts)} agent attempt(s).`,
    '',
    '| Check | Result |',
    '| ----- | ------ |',
    ...x.checks.map((c) => `| ${c.name} | ${c.ok ? 'pass' : 'FAIL'} |`),
    '',
    '## A/B',
    '',
    ...abSection(x.ab),
    '',
    '## Files',
    '',
    ...x.files.map((f) => `- \`${f}\``),
    '',
  ];
}

/** An eval for an existing rule: the rule as it stands, then the A/B. */
function evalBody(x: PrBodyInput): string {
  const s = x.suggestion;
  return [
    `Drafted by \`node tools/bin/suggest-rules.ts draft-eval ${s.rule}\`: an eval for \`${s.rule}\` in \`${s.skill}\`, which had none. The A/B shows the skill improves the result, so the rule earns its place. Review the eval like any other.`,
    '',
    '## Rule',
    '',
    s.draft,
    '',
    ...checksAndAb(x),
  ].join('\n');
}

export function prBody(x: PrBodyInput): string {
  const s = x.suggestion;
  if (s.action === 'eval') return evalBody(x);
  const text = s.action === 'retire' ? (s.reason ?? '') : s.draft;
  return [
    `Drafted by \`node tools/bin/suggest-rules.ts draft ${s.id}\` from proposal \`${s.id}\`: ${s.action} \`${x.ruleId}\` in \`${s.skill}\`. Review it like any other rule change; nothing here merges on its own.`,
    '',
    '## Rule',
    '',
    text,
    '',
    '## Evidence',
    '',
    ...s.evidence.map((e) => `- ${e}`),
    '',
    '## Inclusion criteria',
    '',
    '| Criterion | Answer |',
    '| --------- | ------ |',
    ...CRITERIA.map((c) => `| ${c} | ${cell(s.criteria[c])} |`),
    '',
    ...checksAndAb(x),
  ].join('\n');
}

export interface OpenPr {
  x: Exec;
  wt: string;
  env: NodeJS.ProcessEnv;
  branch: string;
  base: string;
  title: string;
  bodyFile: string;
}

/** Pushes the branch and opens a draft PR with the `run-evals` label. */
export async function openPr(o: OpenPr): Promise<string> {
  await git(o.x, o.wt, o.env, ['push', '-u', 'origin', o.branch]);
  const args = ['pr', 'create', '--draft', '--base', o.base, '--head', o.branch, '--title', o.title];
  const r = await o.x('gh', [...args, '--body-file', o.bodyFile, '--label', PR_LABEL], { cwd: o.wt, env: o.env });
  if (r.status !== 0) throw new Error(`gh pr create: ${r.stderr.trim() || r.stdout.trim()}`);
  return r.stdout.trim();
}
