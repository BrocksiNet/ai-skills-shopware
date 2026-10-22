// Graders of the review-shaped tasks (plan WP5): `review-<rule>-catch` needs
// a finding that names the rule, `review-<rule>-ignore` must not have one,
// and `review-<topic>-near-miss` needs the problem without the decoy rule.
// tools/src/findings.ts documents the findings contract.
import { errorMessage } from '../errors.ts';
import {
  caught,
  decoyCitations,
  type Expectation,
  falsePositives,
  type Finding,
  type NearMiss,
  parseFindings,
  reportedRightly,
} from '../findings.ts';
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
  (e: Pick<Expectation, 'rule' | 'also' | 'summary'>): Grader =>
  ({ transcript }) =>
    withFindings(transcript, (findings) => {
      const [wrong] = falsePositives(findings, e);
      return wrong === undefined
        ? { pass: true, detail: `ignore: ${findings.length} finding(s)` }
        : fail(`false positive: ${wrong.file}: ${wrong.summary}`);
    });

/** Fails when a finding cites the decoy rule; passes when the problem is
 *  reported at the file and severity under an accepted ID or none. */
export const reviewNearMiss =
  (e: NearMiss): Grader =>
  ({ transcript }) =>
    withFindings(transcript, (findings) => {
      const [wrong] = decoyCitations(findings, e);
      if (wrong !== undefined) return fail(`cites ${e.rule} for: ${wrong.summary}`);
      return reportedRightly(findings, e)
        ? { pass: true, detail: `near-miss: ${findings.length} finding(s)` }
        : fail(`no ${e.minSeverity}+ finding at ${e.file} that describes the problem (${findings.length} finding(s))`);
    });
