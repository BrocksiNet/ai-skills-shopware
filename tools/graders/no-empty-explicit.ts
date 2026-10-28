// Grader: no-empty-explicit (PHP-001)
// CustomerEmailValidator takes the blocked domains and no longer calls
// empty() anywhere in its code, neither in the old null-or-empty email check
// nor in the new blocklist path. Comments do not count.
import { fail, findFile, type Grader, read, stripComments, verdict } from '../src/grade/kit.ts';

export const grade: Grader = ({ workdir }) => {
  const file = findFile(workdir, 'CustomerEmailValidator');
  if (file === undefined) return fail('CustomerEmailValidator.php not found');
  const code = stripComments(read(file));
  const usesEmpty = /\bempty\s*\(/u.test(code);
  const blocklist = /\$\w*(?:block|deny|disallow|forbid)\w*/iu.test(code);
  return verdict(!usesEmpty && blocklist, { uses_empty: usesEmpty, blocklist });
};
