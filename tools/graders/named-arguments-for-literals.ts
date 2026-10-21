// Grader: named-arguments-for-literals
import { fail, findFile, flat, type Grader, hasLine, read, verdict } from '../src/grade/kit.ts';

export const grade: Grader = ({ workdir }) => {
  const file = findFile(workdir, 'SnippetLoader');
  if (file === undefined) return fail('SnippetLoader.php not found');
  const text = read(file);
  const oneLine = flat(text);
  const named =
    /dump\s*\([^)]*strict:\s*true/u.test(oneLine) &&
    /dump\s*\([^)]*limit:\s*0/u.test(oneLine) &&
    /dump\s*\([^)]*fallback:\s*null/u.test(oneLine);
  const bare = hasLine(text, /dump\s*\(\s*true\s*,\s*0\s*,\s*null\s*\)/u);
  const count = hasLine(text, /count\s*\(\s*\$items\s*\)/u);
  return verdict(named && !bare && count, { named, bare, count });
};
