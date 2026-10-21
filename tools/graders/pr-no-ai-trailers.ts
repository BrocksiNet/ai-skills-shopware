// Grader: pr-no-ai-trailers (PRD-007)
// Pass: no attribution trailer in any capitalisation, the five template
// sections in order, and each kept text still under its own section.
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

const KEPT: [string, string][] = [
  [S1, 'relates #12345'],
  [S1, 'cannot be decorated by plugins today'],
  [S2, 'Make CartProcessor extensible so plugins can decorate cart calculation'],
  [S2, '#### Impact'],
  [S3, 'The decoration is ignored'],
  [S4, 'Follow-up: move the existing decorators'],
  [S5, '[x] Tests added, and they fail without this change'],
];

export const grade: Grader = ({ workdir }) => {
  const file = filesUnder(workdir).find((f) => basename(f) === 'pr-body.md' && !f.includes('/.claude/'));
  if (file === undefined) return fail('pr-body.md not found');
  const text = read(file);
  const trailer = hasLine(text, /^\s*(co-authored-by|co-committed-by|signed-off-by):/iu);
  const headings = text.split('\n').filter((l) => l.startsWith('### '));
  const sections = headings.join('|') === [S1, S2, S3, S4, S5].join('|');
  const kept = KEPT.every(([heading, needle]) => section(text, heading).includes(needle));
  return verdict(!trailer && sections && kept, { trailer, sections, kept });
};
