// Grader: upgrade-entry-past-tense
import { basename } from 'node:path';
import { countLines, fail, filesUnder, type Grader, hasLine, read, verdict } from '../src/grade/kit.ts';

/** The `## ` sections whose heading names CartProcessor, headings included. */
function cartProcessorSections(text: string): string {
  const out: string[] = [];
  let printing = false;
  for (const line of text.split('\n')) {
    if (line.startsWith('## ')) {
      printing = line.includes('CartProcessor');
      if (printing) out.push(line);
      continue;
    }
    if (printing) out.push(line);
  }
  return out.join('\n');
}

export const grade: Grader = ({ workdir }) => {
  const file = filesUnder(workdir).find((f) => basename(f) === 'UPGRADE-6.8.md');
  if (file === undefined) return fail('UPGRADE-6.8.md not found');
  const text = read(file);
  const versions = countLines(text, /^# 6\.8\.0\.0/u);
  const subject = text.includes('CartProcessor');
  const section = cartProcessorSections(text);
  const past = hasLine(section, /\b(was|were|removed)\b/iu);
  const future = hasLine(section, /\b(will|going to|must be removed)\b/iu);
  return verdict(versions === 1 && subject && past && !future, { versions, subject, past, future });
};
