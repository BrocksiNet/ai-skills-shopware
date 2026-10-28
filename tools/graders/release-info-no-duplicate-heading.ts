// Grader: release-info-no-duplicate-heading
import { basename } from 'node:path';
import { countLines, fail, filesUnder, type Grader, read, verdict } from '../src/grade/kit.ts';

const VERSION = /^# 6\.7\.4\.0\s*$/u;
// A new extension point is a feature or a core change; trunk files both.
const CATEGORY = /^## (?:Features|Core)\s*$/u;

/** The `##` headings of the 6.7.4.0 section, and the category CartProcessor sits in. */
function section(text: string): { headings: string[]; category: string } {
  const headings: string[] = [];
  let inVersion = false;
  let current = '';
  let category = '';
  for (const line of text.split('\n')) {
    if (line.startsWith('# ')) {
      inVersion = VERSION.test(line);
      current = '';
      continue;
    }
    if (!inVersion) continue;
    if (line.startsWith('## ')) {
      current = line.trim();
      headings.push(current);
      continue;
    }
    if (category === '' && line.includes('CartProcessor')) category = current;
  }
  return { headings, category };
}

export const grade: Grader = ({ workdir }) => {
  const file = filesUnder(workdir).find((f) => basename(f) === 'RELEASE_INFO-6.7.md');
  if (file === undefined) return fail('RELEASE_INFO-6.7.md not found');
  const text = read(file);
  const versions = countLines(text, VERSION);
  const { headings, category } = section(text);
  const repeated = headings.length !== new Set(headings).size;
  const existing = text.includes('ProductRoute');
  const inCategory = CATEGORY.test(category);
  return verdict(versions === 1 && !repeated && existing && inCategory, {
    versions,
    repeated,
    existing,
    in_category: inCategory,
  });
};
