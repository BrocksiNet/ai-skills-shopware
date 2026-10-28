// Grader: dal-export-pages-through-all (ARCH-002)
// The export needs every product of a category, so one read with a limit
// drops the rest and one read without a limit loads them all at once. Some
// method that reads products has to page in a loop: RepositoryIterator or
// IteratorFactory on the DAL, or a limit plus an offset or last-ID cursor
// (Criteria or SQL). The method may sit in the command or in a service the
// agent added, and may reach the paging through same-class helpers.
import { filesUnder, type Grader, read, stripComments, verdict } from '../src/grade/kit.ts';
import { methodReaches, phpMethodNames } from '../src/grade/php-calls.ts';

const READ =
  /->search(?:Ids)?\s*\(|->fetch\w*\s*\(|->executeQuery\s*\(|->iterate\w*\s*\(|RepositoryIterator|IteratorFactory|->createIterator\s*\(/u;
const PAGER = /new\s+\\?(?:[\w\\]+\\)?RepositoryIterator\s*\(|IteratorFactory|->createIterator\s*\(/u;
const LIMITED = /->setLimit\s*\(|\bLIMIT\s+[:?\d]/iu;
const CURSOR = /->setOffset\s*\(|\bOFFSET\s+[:?\d]|\bid\s*>\s*[:?]/iu;
const LOOP = /\b(?:while|for|do)\b\s*[({]/u;

export const grade: Grader = ({ workdir }) => {
  let reads = false;
  let pages = false;
  for (const file of filesUnder(workdir).filter((f) => f.endsWith('.php'))) {
    const code = stripComments(read(file));
    for (const name of phpMethodNames(code)) {
      if (!methodReaches(code, name, READ)) continue;
      reads = true;
      const paged =
        methodReaches(code, name, PAGER) || (methodReaches(code, name, LIMITED) && methodReaches(code, name, CURSOR));
      if (paged && methodReaches(code, name, LOOP)) pages = true;
    }
  }
  return verdict(reads && pages, { reads, pages });
};
