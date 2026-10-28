// Grader: dal-search-without-limit (ARCH-002)
// Every ProductLoader method that searches the repository sets a limit, in
// its own body or in a helper it calls. RepositoryIterator also pages with a
// limit. A limit in an unused helper or a comment does not count.
import { fail, findFile, type Grader, read, stripComments, verdict } from '../src/grade/kit.ts';
import { methodReaches, phpMethodNames } from '../src/grade/php-calls.ts';

const SEARCH = /->search(?:Ids)?\s*\(|\bRepositoryIterator\b/u;
const BOUND = /->setLimit\s*\(|new\s+\\?(?:[\w\\]+\\)?RepositoryIterator\s*\(/u;

export const grade: Grader = ({ workdir }) => {
  const file = findFile(workdir, 'ProductLoader');
  if (file === undefined) return fail('ProductLoader.php not found');
  const code = stripComments(read(file));
  const readers = phpMethodNames(code).filter((name) => methodReaches(code, name, SEARCH));
  const repo = readers.length > 0 && /EntityRepository/u.test(code);
  const unbounded = readers.filter((name) => !methodReaches(code, name, BOUND));
  const category = /categor/iu.test(code);
  return verdict(repo && unbounded.length === 0 && category, {
    repo,
    limit: unbounded.length === 0,
    category,
    ...(unbounded.length > 0 ? { unbounded: unbounded.join(',') } : {}),
  });
};
