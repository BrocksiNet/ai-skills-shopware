// `suggest-rules draft` (plan WP12 step 5): the suggestion to draft, read
// back from suggestions/<date>.json, and the prompt that asks the agent to
// make the change in a worktree by the steps in AGENTS.md.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Catalog, Rule } from './catalog.ts';
import { tail } from './proc.ts';
import { isSuggestion, type Suggestion } from './suggest-ask.ts';

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

/** The suggestion `id` (`2026-10-23-04`) from `<dir>/<date>.json`. */
export function loadSuggestion(dir: string, id: string): Suggestion {
  const day = /^(\d{4}-\d{2}-\d{2})-\d+$/u.exec(id)?.[1];
  if (day === undefined) throw new Error(`not a suggestion ID: ${id} (expected YYYY-MM-DD-NN)`);
  const file = join(dir, `${day}.json`);
  if (!existsSync(file)) throw new Error(`${file} not found; run suggest-rules first`);
  const data: unknown = JSON.parse(readFileSync(file, 'utf8'));
  const list = isRecord(data) && Array.isArray(data.suggestions) ? data.suggestions : [];
  const found: unknown = list.find((s: unknown) => isRecord(s) && s.id === id);
  if (found === undefined) throw new Error(`${id} is not in ${file}`);
  if (!isSuggestion(found)) throw new Error(`${id} in ${file} is not a valid suggestion`);
  return found;
}

const MAX_SLUG = 48;

/** `rules/<skill>-<slug of the title>`, cut at a word. */
export function branchName(s: Suggestion): string {
  const words = `${s.rule === '' ? '' : `${s.rule} `}${s.title}`
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/gu, '-')
    .replaceAll(/^-|-$/gu, '');
  const cut = words.length > MAX_SLUG ? words.slice(0, MAX_SLUG + 1).replace(/-[^-]*$/u, '') : words;
  const slug = cut || words.slice(0, MAX_SLUG) || 'rule';
  return `rules/${s.skill.replace(/^sw-/u, '')}-${slug}`;
}

const idNumber = (id: string, prefix: string): number =>
  id.startsWith(`${prefix}-`) ? Number(id.slice(prefix.length + 1)) : 0;

/** The next free rule ID of a skill, counting retired IDs too. */
export function nextFreeId(catalog: Catalog, skill: string): string {
  const prefix = Object.entries(catalog.prefixes).find(([, owner]) => owner === skill)?.[0];
  if (prefix === undefined) throw new Error(`${skill} has no rule ID prefix in rules/catalog.json`);
  const last = Math.max(0, ...catalog.rules.map((r) => idNumber(r.id, prefix)));
  return `${prefix}-${String(last + 1).padStart(3, '0')}`;
}

/** A recent rule of the skill with a review pair or a task, as a pattern to copy. */
function example(catalog: Catalog, skill: string, kind: string): Rule | undefined {
  const own = catalog.rules.filter((r) => r.skill === skill && r.status === 'active' && r.eval !== null);
  const pair = own.filter((r) => r.eval?.startsWith('review-') === true);
  const pool = kind === 'review-pair' && pair.length > 0 ? pair : own;
  return pool.at(-1);
}

function steps(s: Suggestion, catalog: Catalog): string[] {
  const rule = catalog.rules.find((r) => r.id === s.rule);
  const pattern = example(catalog, s.skill, s.eval?.kind ?? 'task');
  const copy =
    pattern === undefined
      ? 'Look at an existing task in evals/tasks/ of the same kind as a pattern.'
      : `Copy the shape of ${pattern.id} (${pattern.file}, eval ${pattern.eval ?? ''}, grader tools/graders/${pattern.eval ?? ''}.ts).`;
  if (s.action === 'new')
    return [
      `Add the rule as ${nextFreeId(catalog, s.skill)} in the file of ${s.skill} that owns the topic (SKILL.md or a reference its routes.json lists), as a bullet starting with the bold ID.`,
      'Add its entry to rules/catalog.json with file, title, since (today), eval, audience and defer_on_trunk.',
      `Add the eval: ${s.eval?.kind === 'review-pair' ? 'a review pair review-<topic>-catch and review-<topic>-ignore' : 'a task'} with grade.sh, its grader in tools/graders/, fixture/, fixtures/pass/ and an almost-pass fixtures/fail/. ${copy}`,
      `Add one prompt to skills/${s.skill}/evals/should-trigger.md if the rule adds a new trigger.`,
    ];
  if (s.action === 'update')
    return [
      `Change the text of ${s.rule} in ${rule?.file ?? 'its file'} to say what the draft says. Keep the ID and the bold tag.`,
      `Update the title in rules/catalog.json if it no longer fits. Change the eval ${rule?.eval ?? ''} only if the rule now covers a case it does not test; then add a fixture or a pass/fail golden case for it. ${copy}`,
    ];
  if (s.action === 'retire')
    return [
      `Set the status of ${s.rule} in rules/catalog.json to "retired" and remove its bullet from ${rule?.file ?? 'its file'}.`,
      `Leave its eval task ${rule?.eval ?? ''} in place; the retired catalog entry keeps naming it.`,
      'If the reason is a CI check, run node tools/bin/render-enforced.ts.',
    ];
  return ['Nothing to change: the proposal says the rules already cover this.'];
}

export interface DraftPromptInput {
  suggestion: Suggestion;
  catalog: Catalog;
}

/** The first prompt: the proposal and the steps for its action. */
export function draftPrompt({ suggestion: s, catalog }: DraftPromptInput): string {
  const proposal = {
    action: s.action,
    skill: s.skill,
    rule: s.rule,
    title: s.title,
    draft: s.draft,
    eval: s.eval,
    reason: s.reason,
    criteria: s.criteria,
  };
  return [
    'You edit this repository, a library of agent skills for Shopware 6, to make one rule change.',
    'Read AGENTS.md first, the sections "Adding or changing a rule" and "Grader contract", and follow them.',
    '',
    'The change, as proposed by an earlier review of maintainer comments:',
    '```json',
    JSON.stringify(proposal, null, 2),
    '```',
    '',
    'Steps:',
    ...steps(s, catalog).map((line, i) => `${String(i + 1)}. ${line}`),
    `${String(steps(s, catalog).length + 1)}. Run bash scripts/validate-skills.sh and bash evals/test-graders.sh and fix what they report.`,
    '',
    'Constraints:',
    '- Write the rule in your own words. Do not quote review comments; the PR links are added later.',
    '- Change only what the rule needs. Do not commit, push, or touch .github/.',
    '- Do not edit the "Already enforced by CI" sections by hand.',
    '',
    'End with a short summary: the files you changed and the rule ID.',
  ].join('\n');
}

/** The one retry: the first prompt plus what failed. */
export function retryPrompt(first: string, failures: { name: string; output: string }[]): string {
  return [
    first,
    '',
    'Your first attempt is in the working tree. These checks failed; fix the cause, keep the rest:',
    ...failures.map((f) => `\n## ${f.name}\n\n\`\`\`text\n${tail(f.output, 60)}\`\`\``),
  ].join('\n');
}
