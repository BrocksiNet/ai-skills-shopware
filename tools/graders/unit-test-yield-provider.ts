// Grader: unit-test-yield-provider
// PASS when PriceCalculatorTest's data provider yields cases in real code
// (comments stripped), without returning an array literal or `yield from`.
import { fail, findFile, type Grader, hasLine, read, stripComments, verdict } from '../src/grade/kit.ts';

export const grade: Grader = ({ workdir }) => {
  const file = findFile(workdir, 'PriceCalculatorTest');
  if (file === undefined) return fail('PriceCalculatorTest.php not found');
  const code = stripComments(read(file));
  const usesYield = hasLine(code, /\byield\s+/u);
  const returnArray = hasLine(code, /\breturn\s*\[/u);
  const yieldFrom = hasLine(code, /\byield\s+from\b/u);
  return verdict(usesYield && !returnArray && !yieldFrom, {
    yield: usesYield,
    return_array: returnArray,
    yield_from: yieldFrom,
  });
};
