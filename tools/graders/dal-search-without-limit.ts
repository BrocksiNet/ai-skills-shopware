// Grader: dal-search-without-limit
import { fail, findFile, type Grader, hasLine, read, stripComments, verdict } from '../src/grade/kit.ts';

export const grade: Grader = ({ workdir }) => {
  const file = findFile(workdir, 'ProductLoader');
  if (file === undefined) return fail('ProductLoader.php not found');
  const code = stripComments(read(file));
  const repo = hasLine(code, /EntityRepository|->search\s*\(/u);
  // A bounded Criteria, or RepositoryIterator, which pages with a limit.
  const limit = hasLine(code, /setLimit\s*\(|new\s+\\?(?:[\w\\]+\\)?RepositoryIterator\s*\(/u);
  return verdict(repo && limit, { repo, limit });
};
