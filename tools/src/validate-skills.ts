// Static validation of every skill (scripts/validate-skills.sh). Cheap,
// deterministic, runs on every push.
//
// Per skill: frontmatter `name` matches the folder, the description is under
// 1024 characters (the budget every provider loads up front), SKILL.md is
// under 500 lines, both activation eval files exist, and every
// `](references/x.md)` link resolves. Across skills: no trigger phrase is
// claimed twice and no REGISTRY.md topic has two owners. Then the rule ID
// and reference route checks, then the router index and the help skill.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { checkRoutes, checkRules } from './check-reports.ts';
import {
  frontmatter,
  lineCount,
  overlapErrors,
  referenceLinks,
  registryDuplicates,
  textLength,
  triggerPhrases,
} from './skill-checks.ts';
import { routerErrors } from './router-index.ts';
import { sourceErrors } from './sources.ts';
import { compareText } from './text.ts';

const MAX_DESCRIPTION = 1024;
const MAX_LINES = 500;
const EVAL_FILES = ['evals/should-trigger.md', 'evals/should-not-trigger.md'];

export interface ValidateSkillsOptions {
  root: string;
  out: (text: string) => void;
  err: (text: string) => void;
}

interface Skill {
  errors: string[];
  phrases: string[];
}

function checkSkill(dir: string, skill: string): Skill {
  const md = join(dir, 'SKILL.md');
  if (!existsSync(md)) return { errors: [`${skill}: missing SKILL.md`], phrases: [] };
  const text = readFileSync(md, 'utf8');
  const { name, description } = frontmatter(text);
  const length = textLength(description);
  const lines = lineCount(text);
  const errors = [
    name === skill ? '' : `${skill}: frontmatter name '${name}' != folder name`,
    length < MAX_DESCRIPTION ? '' : `${skill}: description is ${length} chars (>= ${MAX_DESCRIPTION})`,
    length > 0 ? '' : `${skill}: empty description`,
    lines < MAX_LINES ? '' : `${skill}: SKILL.md is ${lines} lines (>= ${MAX_LINES})`,
    ...EVAL_FILES.map((f) => (existsSync(join(dir, f)) ? '' : `${skill}: missing ${f}`)),
    ...referenceLinks(text).map((rel) =>
      existsSync(join(dir, rel)) ? '' : `${skill}: dead internal link references/ -> ${rel}`,
    ),
  ].filter((e) => e !== '');
  return { errors, phrases: triggerPhrases(description) };
}

function registryErrors(root: string): string[] {
  const registry = join(root, 'REGISTRY.md');
  if (!existsSync(registry)) return ['REGISTRY.md not found'];
  return registryDuplicates(readFileSync(registry, 'utf8')).map(
    (t) => `duplicate topic ownership in REGISTRY.md: '${t}'`,
  );
}

/** Prints each skill and its errors, then the summary. Exit 0 = OK, 1 = errors. */
export function validateSkills(o: ValidateSkillsOptions): number {
  let errors = 0;
  const report = (e: string): void => {
    o.out(`  ERROR: ${e}\n`);
    errors += 1;
  };
  const skillsDir = join(o.root, 'skills');
  const skills = readdirSync(skillsDir)
    .filter((s) => statSync(join(skillsDir, s)).isDirectory())
    .toSorted(compareText);
  const phrases = new Map<string, string[]>();
  for (const skill of skills) {
    o.out(`Checking ${skill}\n`);
    const result = checkSkill(join(skillsDir, skill), skill);
    for (const e of result.errors) report(e);
    phrases.set(skill, result.phrases);
  }
  for (const e of [...overlapErrors(phrases), ...registryErrors(o.root)]) report(e);

  o.out('\nChecking rule IDs\n');
  if (checkRules(o.root, o.out, o.err) !== 0) report('rule catalog check failed (see above)');
  o.out('\nChecking reference routes\n');
  if (checkRoutes(o.root, o.out) !== 0) report('reference routing check failed (see above)');
  o.out('\nChecking drift sources\n');
  for (const e of sourceErrors(o.root, skills)) report(e);
  o.out('\nChecking sw-skill-router index and sw-help\n');
  for (const e of routerErrors(o.root)) report(e);

  o.out(errors === 0 ? '\nvalidate-skills: OK\n' : `\nvalidate-skills: ${errors} error(s)\n`);
  return errors === 0 ? 0 : 1;
}
