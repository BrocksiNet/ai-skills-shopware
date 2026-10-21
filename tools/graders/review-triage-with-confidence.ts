// Grader: review-triage-with-confidence (shopware-pr-review)
// Every thread needs a classified action (fix / reply / push back) and an
// explicit confidence percentage. T1 is a real bug (fix); T3 asks for a
// guideline violation (push back).
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fail, type Grader, hasLine, read, verdict } from '../src/grade/kit.ts';

/** The body of the `## <id>` section: the lines up to the next `## ` heading. */
function section(text: string, id: string): string {
  const heading = new RegExp(String.raw`^##\s+${id}([^0-9]|$)`, 'u');
  const out: string[] = [];
  let grab = false;
  for (const line of text.split('\n')) {
    if (/^##\s/u.test(line)) {
      grab = heading.test(line);
      continue;
    }
    if (grab) out.push(line);
  }
  return out.join('\n');
}

export const grade: Grader = ({ workdir }) => {
  const file = join(workdir, 'triage.md');
  const text = existsSync(file) ? read(file) : '';
  if (text === '') return fail('triage.md missing or empty');

  let classified = 0;
  let confident = 0;
  for (const t of ['T1', 'T2', 'T3']) {
    const body = section(text, t);
    if (hasLine(body, /\b(fix|reply|push[ -]?back|clarif)/iu)) classified += 1;
    if (hasLine(body, /[0-9]{1,3}\s?%/u)) confident += 1;
  }
  const t1Fix = hasLine(section(text, 'T1'), /\bfix/iu);
  const t3Push = hasLine(section(text, 'T3'), /push[ -]?back|decline|keep the explicit|not (use|switch to) `?empty/iu);

  return verdict(classified === 3 && confident === 3 && t1Fix && t3Push, {
    classified: `${classified}/3`,
    confidence: `${confident}/3`,
    t1_fix: t1Fix,
    t3_push_back: t3Push,
  });
};
