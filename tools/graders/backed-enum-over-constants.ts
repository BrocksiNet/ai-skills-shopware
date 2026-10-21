// Grader: backed-enum-over-constants
// PASS when OrderStatus is a backed string enum with the three cases and the
// old `const OPEN/PAID/CANCELLED` string constants are gone.
import { fail, findFile, type Grader, hasLine, read, verdict } from '../src/grade/kit.ts';

export const grade: Grader = ({ workdir }) => {
  const file = findFile(workdir, 'OrderStatus');
  if (file === undefined) return fail('OrderStatus.php not found');
  const text = read(file);
  const isEnum = hasLine(text, /enum\s+OrderStatus\s*:\s*string/u);
  const hasCases =
    hasLine(text, /case\s+Open\s*=\s*'open'/u) &&
    hasLine(text, /case\s+Paid\s*=\s*'paid'/u) &&
    hasLine(text, /case\s+Cancelled\s*=\s*'cancelled'/u);
  const oldConsts = hasLine(text, /const\s+(OPEN|PAID|CANCELLED)\s*=/u);
  return verdict(isEnum && hasCases && !oldConsts, { enum: isEnum, cases: hasCases, old_consts: oldConsts });
};
