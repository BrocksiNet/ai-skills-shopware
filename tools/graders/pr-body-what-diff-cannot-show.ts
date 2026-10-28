// Grader: pr-body-what-diff-cannot-show (PRD-003)
// Pass: the five template sections in order; the problem in section 1; the
// approach in section 2 as one or two statements with no file names; an
// Impact sub-section; no account of the work session.
import { basename } from 'node:path';
import { fail, filesUnder, type Grader, hasLine, read, verdict } from '../src/grade/kit.ts';

const S1 = '### 1. What and why?';
const S2 = '### 2. How?';
const S3 = '### 3. Testing';
const S4 = '### 4. Additional notes';
const S5 = '### 5. Checklist';

/** The lines after `heading` up to the next `### ` heading. `#### Impact`
 *  stays inside section 2. */
function section(text: string, heading: string): string {
  const lines = text.split('\n');
  const start = lines.indexOf(heading);
  if (start === -1) return '';
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((l) => l.startsWith('### '));
  return (end === -1 ? rest : rest.slice(0, end)).join('\n');
}

/** Section 2 up to its Impact sub-section: the approach, without the impact. */
function approach(text: string): string {
  const lines = section(text, S2).split('\n');
  const impact = lines.indexOf('#### Impact');
  return (impact === -1 ? lines : lines.slice(0, impact)).join('\n');
}

/** Sentences in `text`: a `.`, `!` or `?` that ends a word. */
const sentences = (text: string): number => text.split(/[.!?](?:\s|$)/u).filter((s) => s.trim() !== '').length;

/** A file name or path: the diff lists these, the approach does not. */
const FILE = /\bsrc\/|\b[\w-]+\.(?:php|xml|twig|js|ts|json|ya?ml|md)\b/u;

/** First-person narration of the work: "I first tried", "then I switched". */
const SESSION =
  /\b(?:I|we)\s+(?:first\s+|initially\s+)?(?:tried|started|switched|went|discovered|debugged)\b|\b(?:first|then|initially|eventually)\s+(?:I|we)\b/iu;

export const grade: Grader = ({ workdir }) => {
  const file = filesUnder(workdir).find((f) => basename(f) === 'pr-body.md' && !f.includes('/.claude/'));
  if (file === undefined) return fail('pr-body.md not found');
  const text = read(file);
  const headings = text.split('\n').filter((l) => l.startsWith('### '));
  const sections = headings.join('|') === [S1, S2, S3, S4, S5].join('|');
  const problem = /decorat/iu.test(section(text, S1));
  const how = approach(text);
  const statements = how.split('\n').filter((l) => l.trim() !== '').length;
  const short = statements > 0 && statements <= 2 && sentences(how) <= 2;
  const impact = hasLine(section(text, S2), /^#### Impact$/u);
  const listsFiles = FILE.test(section(text, S2));
  const narrates = SESSION.test(text);
  return verdict(sections && problem && short && impact && !listsFiles && !narrates, {
    sections,
    problem,
    short,
    impact,
    lists_files: listsFiles,
    narrates,
  });
};
