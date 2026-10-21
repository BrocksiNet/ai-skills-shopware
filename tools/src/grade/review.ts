// Graders of the review-shaped tasks (plan WP5): `review-<rule>-catch` needs
// a finding that names the rule, `review-<rule>-ignore` must not have one.
// tools/src/findings.ts documents the findings contract.
import { errorMessage } from '../errors.ts';
import { caught, type Expectation, falsePositives, type Finding, parseFindings } from '../findings.ts';
import { fail, type Grader, type Verdict } from './kit.ts';

function withFindings(transcript: string, check: (findings: Finding[]) => Verdict): Verdict {
  let findings: Finding[];
  try {
    findings = parseFindings(transcript);
  } catch (error) {
    return fail(errorMessage(error));
  }
  return check(findings);
}

/** Passes when a finding names the rule at the file and severity. */
export const reviewCatch =
  (e: Expectation): Grader =>
  ({ transcript }) =>
    withFindings(transcript, (findings) =>
      caught(findings, e)
        ? { pass: true, detail: `catch: ${findings.length} finding(s)` }
        : fail(`no ${e.minSeverity}+ finding for ${e.rule} at ${e.file} (${findings.length} finding(s))`),
    );

/** Fails on a finding above `nit` that names the rule anywhere. */
export const reviewIgnore =
  (e: Pick<Expectation, 'rule' | 'summary'>): Grader =>
  ({ transcript }) =>
    withFindings(transcript, (findings) => {
      const [wrong] = falsePositives(findings, e);
      return wrong === undefined
        ? { pass: true, detail: `ignore: ${findings.length} finding(s)` }
        : fail(`false positive: ${wrong.file}: ${wrong.summary}`);
    });
