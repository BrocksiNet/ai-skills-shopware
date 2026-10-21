// Grader: dal-search-without-limit
import { fail, findFile, type Grader, hasLine, read, verdict } from '../src/grade/kit.ts';

export const grade: Grader = ({ workdir }) => {
  const file = findFile(workdir, 'ProductLoader');
  if (file === undefined) return fail('ProductLoader.php not found');
  const text = read(file);
  const repo = hasLine(text, /EntityRepository|->search\s*\(/u);
  const limit = hasLine(text, /setLimit\s*\(/u);
  return verdict(repo && limit, { repo, limit });
};
