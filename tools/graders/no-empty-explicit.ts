// Grader: no-empty-explicit — sw-php-foundation trunk habit (review-backed).
// UserValidator must not call empty() and must compare explicitly.
import { fail, findFile, type Grader, hasLine, read, verdict } from '../src/grade/kit.ts';

export const grade: Grader = ({ workdir }) => {
  const file = findFile(workdir, 'UserValidator');
  if (file === undefined) return fail('UserValidator.php not found');
  const text = read(file);
  const usesEmpty = hasLine(text, /\bempty\s*\(/u);
  const explicit = hasLine(text, /=== ''|=== null|!== ''|!== null/u);
  return verdict(!usesEmpty && explicit, { uses_empty: usesEmpty, explicit_check: explicit });
};
