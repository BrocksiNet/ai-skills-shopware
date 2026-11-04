// Review findings in an agent transcript, and the catch, ignore and near-miss
// checks of the review-shaped eval tasks (plan WP5).
//
// The agent ends its answer with one fenced `json` block:
//
//   {"findings": [{"rule_id": "PLG-027", "severity": "major", "file": "src/…",
//     "line": 42, "summary": "…", "fix": "…"}]}
//
// `rule_id` may be null or missing; `line` and `fix` are optional.

export const SEVERITIES = ['nit', 'minor', 'major', 'blocking'] as const;
export type Severity = (typeof SEVERITIES)[number];

export interface Finding {
  rule_id: string | null;
  severity: Severity;
  file: string;
  summary: string;
}

/** What a task looks for: a rule ID prefix, the file it is in, and the
 *  words a reviewer who does not know our IDs would use. */
export interface Expectation {
  rule: string;
  /** Other IDs that are just as right for the problem, such as the general
   *  rule next to the specific one. */
  also?: string[];
  file: string;
  minSeverity: Severity;
  summary: RegExp;
  /** Other genuine problems in this fixture, explicitly permitted by its author. */
  allowed?: Expectation[];
  /** Used only by a task explicitly measuring attribution as well as detection. */
  requireCitation?: boolean;
}

export type IgnoreExpectation = Pick<Expectation, 'rule' | 'also' | 'summary' | 'allowed'>;

type Json = Record<string, unknown>;
const isRecord = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v);
const isSeverity = (v: unknown): v is Severity => SEVERITIES.some((s) => s === v);

/** A rule ID from a guideline catalog, like `PLG-027` or `BCPHP-001`. */
const CATALOG_ID = /^[A-Z]+-[0-9]{3}/u;

/** The text of the last fenced `json` block, or undefined. */
export function lastJsonBlock(transcript: string): string | undefined {
  const blocks = Array.from(transcript.matchAll(/^```json[ \t]*\n([\s\S]*?)^```[ \t]*$/gmu), (m) => m[1] ?? '');
  return blocks.at(-1);
}

function finding(value: unknown, index: number): Finding {
  if (!isRecord(value)) throw new Error(`findings[${index}] is not an object`);
  const { rule_id: ruleId, severity, file, summary } = value;
  if (ruleId !== undefined && ruleId !== null && typeof ruleId !== 'string')
    throw new TypeError(`findings[${index}].rule_id must be a string or null`);
  if (!isSeverity(severity)) throw new Error(`findings[${index}].severity must be one of ${SEVERITIES.join(', ')}`);
  if (typeof file !== 'string' || typeof summary !== 'string') {
    throw new TypeError(`findings[${index}] needs file and summary strings`);
  }
  return { rule_id: typeof ruleId === 'string' && ruleId !== '' ? ruleId : null, severity, file, summary };
}

/** The findings of the last fenced `json` block. Throws when there is no
 *  block or it does not have the contract's shape. */
export function parseFindings(transcript: string): Finding[] {
  const block = lastJsonBlock(transcript);
  if (block === undefined) throw new Error('no fenced json block in the transcript');
  const value: unknown = JSON.parse(block);
  if (!isRecord(value) || !Array.isArray(value.findings)) throw new Error('the json block has no findings list');
  const items: unknown[] = value.findings;
  return items.map((item, i) => finding(item, i));
}

/** `**` crosses folders, `*` and `?` do not. A leading `./` is ignored. */
export function globMatches(glob: string, path: string): boolean {
  const pattern = glob
    .split(/(\*\*\/?|\*|\?)/u)
    .map((part) => {
      if (part === '**/') return '(?:.*/)?';
      if (part === '**') return '.*';
      if (part === '*') return '[^/]*';
      if (part === '?') return '[^/]';
      return part.replaceAll(/[.+^${}()|[\]\\]/gu, String.raw`\$&`);
    })
    .join('');
  return new RegExp(`^${pattern}$`, 'u').test(path.replace(/^\.\//u, ''));
}

const atLeast = (s: Severity, min: Severity): boolean => SEVERITIES.indexOf(s) >= SEVERITIES.indexOf(min);

/** The finding names the rule: our ID, or, without a catalog ID, a summary
 *  in the reviewer's own words. A different catalog ID is a wrong rule. */
const citesRule = (f: Finding, e: Pick<Expectation, 'rule' | 'also'>): boolean =>
  [e.rule, ...(e.also ?? [])].includes(f.rule_id ?? '');

export function namesRule(f: Finding, e: Expectation): boolean {
  return (
    e.summary.test(f.summary) &&
    (e.requireCitation !== true || citesRule(f, e)) &&
    (f.rule_id === null || !CATALOG_ID.test(f.rule_id) || citesRule(f, e))
  );
}

/** The catch task passes when a finding names the rule, at the file, at the
 *  minimum severity or above. */
export const caught = (findings: Finding[], e: Expectation): boolean =>
  findings.some((f) => namesRule(f, e) && globMatches(e.file, f.file) && atLeast(f.severity, e.minSeverity));

/** Clean twins reject every substantive claim except documented real issues. */
export const falsePositives = (findings: Finding[], e: IgnoreExpectation): Finding[] =>
  findings.filter((f) => f.severity !== 'nit' && !(e.allowed ?? []).some((allowed) => caught([f], allowed)));

/** Catch tasks also reject extra claims that their fixture does not justify. */
export const unexpectedFindings = (findings: Finding[], e: Expectation): Finding[] =>
  findings.filter((f) => f.severity !== 'nit' && ![e, ...(e.allowed ?? [])].some((expected) => caught([f], expected)));

/** A near-miss task plants a real problem next to a rule that does not cover
 *  it. `rule` is that decoy; `accept` lists the IDs that do cover the problem
 *  (empty when no rule does). */
export interface NearMiss extends Expectation {
  accept: string[];
}

/** Findings above `nit` that describe the problem and cite the decoy rule. */
export const decoyCitations = (findings: Finding[], e: NearMiss): Finding[] =>
  findings.filter((f) => f.severity !== 'nit' && f.rule_id === e.rule && e.summary.test(f.summary));

/** The near-miss task needs the problem reported at the file and severity,
 *  under an accepted ID, a non-catalog ID or none. */
export const reportedRightly = (findings: Finding[], e: NearMiss): boolean =>
  findings.some(
    (f) =>
      globMatches(e.file, f.file) &&
      atLeast(f.severity, e.minSeverity) &&
      e.summary.test(f.summary) &&
      (f.rule_id === null || !CATALOG_ID.test(f.rule_id) || e.accept.includes(f.rule_id)),
  );
