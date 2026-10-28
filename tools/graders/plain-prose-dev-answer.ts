// Grader: plain-prose-dev-answer (STY-001)
// Pass: answer.md names a composer constraint that covers 6.6 and 6.7 and
// the migration, and its prose has none of the tells in grade/prose.ts
// (bold-label lists, staged contrasts, run-ups, chat phrases, dashes).
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fail, type Grader, hasLine, read, verdict } from '../src/grade/kit.ts';
import { proseTells, tellList } from '../src/grade/prose.ts';

export const grade: Grader = ({ workdir }) => {
  const file = join(workdir, 'answer.md');
  const text = existsSync(file) ? read(file) : '';
  if (text.trim() === '') return fail('answer.md missing or empty');
  const constraint = hasLine(text, /6\.6\S*\s*\|\|\s*\S*6\.7/u);
  const migration = hasLine(text, /migration/iu);
  const tells = proseTells(text);
  const plain = Object.keys(tells).length === 0;
  return verdict(constraint && migration && plain, { constraint, migration, tells: tellList(tells) });
};
