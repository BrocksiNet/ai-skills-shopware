// Review findings in an agent transcript, and the catch and ignore checks of
// the review-shaped eval tasks (plan WP5).
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
  file: string;
  minSeverity: Severity;
  summary: RegExp;
}

type Json = Record<string, unknown>;
const isRecord = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v);
const isSeverity = (v: unknown): v is Severity => SEVERITIES.some((s) => s === v);

/** A rule ID from a guideline catalog, like `PLG-027` or `BCPHP-001`. */
const CATALOG_ID = /^[A-Z]+-[0-9]{3}$/u;

/** The text of the last fenced `json` block, or undefined. */
export function lastJsonBlock(transcript: string): string | undefined {
  const blocks = Array.from(transcript.matchAll(/^```json[ \t]*\n([\s\S]*?)^```[ \t]*$/gmu), (m) => m[1] ?? '');
  return blocks.at(-1);
}

function finding(value: unknown, index: number): Finding {
  if (!isRecord(value)) throw new Error(`findings[${index}] is not an object`);
  const { rule_id: ruleId, severity, file, summary } = value;
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
export function namesRule(f: Finding, e: Expectation): boolean {
  if (f.rule_id?.startsWith(e.rule) === true) return true;
  if (f.rule_id !== null && CATALOG_ID.test(f.rule_id)) return false;
  return e.summary.test(f.summary);
}

/** The catch task passes when a finding names the rule, at the file, at the
 *  minimum severity or above. */
export const caught = (findings: Finding[], e: Expectation): boolean =>
  findings.some((f) => namesRule(f, e) && globMatches(e.file, f.file) && atLeast(f.severity, e.minSeverity));

/** The ignore task fails on a finding above `nit` that names the rule
 *  anywhere in the diff: the clean change only looks like the problem. */
export const falsePositives = (findings: Finding[], e: Pick<Expectation, 'rule' | 'summary'>): Finding[] =>
  findings.filter(
    (f) =>
      f.severity !== 'nit' &&
      (f.rule_id?.startsWith(e.rule) === true ||
        ((f.rule_id === null || !CATALOG_ID.test(f.rule_id)) && e.summary.test(f.summary))),
  );
