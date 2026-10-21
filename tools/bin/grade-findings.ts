// Grader for the review-shaped eval tasks (plan WP5). A task's grade.sh
// calls it; tools/src/findings.ts documents the findings contract.
//
//   grade-findings.ts catch  --rule TEST-016 --file 'tests/**' --min-severity major --summary '<regex>'
//   grade-findings.ts ignore --rule TEST-016 --summary '<regex>'
//
// Reads the transcript from $TRANSCRIPT. Prints `score=1 (...)` or
// `score=0 (...)`. Exit 0 = pass, 1 = fail, 2 = usage.
import { readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { stderr, stdout } from '../src/cli.ts';
import { envOr } from '../src/env.ts';
import { errorMessage } from '../src/errors.ts';
import { caught, falsePositives, type Finding, parseFindings, SEVERITIES, type Severity } from '../src/findings.ts';

const USAGE =
  'usage: grade-findings.ts catch --rule ID --file GLOB --min-severity LEVEL --summary REGEX\n' +
  '       grade-findings.ts ignore --rule ID --summary REGEX\n';

const isSeverity = (v: string): v is Severity => SEVERITIES.some((s) => s === v);

function grade(mode: string, findings: Finding[], o: Record<string, string | undefined>): string | undefined {
  const rule = o.rule ?? '';
  const summary = new RegExp(o.summary ?? '', 'iu');
  if (mode === 'ignore') {
    const wrong = falsePositives(findings, { rule, summary });
    return wrong.length === 0 ? undefined : `false positive: ${wrong[0]?.file ?? ''}: ${wrong[0]?.summary ?? ''}`;
  }
  const min = o['min-severity'] ?? '';
  if (!isSeverity(min)) throw new Error(`--min-severity must be one of ${SEVERITIES.join(', ')}`);
  return caught(findings, { rule, file: o.file ?? '', minSeverity: min, summary })
    ? undefined
    : `no ${min}+ finding for ${rule} at ${o.file ?? ''} (${findings.length} finding(s))`;
}

function main(): number {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: {
      rule: { type: 'string' },
      file: { type: 'string' },
      'min-severity': { type: 'string' },
      summary: { type: 'string' },
    },
  });
  const [mode] = positionals;
  const needed =
    mode === 'catch'
      ? [values.rule, values.file, values['min-severity'], values.summary]
      : [values.rule, values.summary];
  if (positionals.length !== 1 || (mode !== 'catch' && mode !== 'ignore') || needed.includes(undefined)) {
    stderr(USAGE);
    return 2;
  }
  try {
    const findings = parseFindings(readFileSync(envOr(process.env, 'TRANSCRIPT', ''), 'utf8'));
    const failure = grade(mode, findings, values);
    stdout(failure === undefined ? `score=1 (${mode}: ${findings.length} finding(s))\n` : `score=0 (${failure})\n`);
    return failure === undefined ? 0 : 1;
  } catch (error) {
    stdout(`score=0 (${errorMessage(error)})\n`);
    return 1;
  }
}

process.exitCode = main();
