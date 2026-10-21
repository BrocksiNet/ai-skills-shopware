// Grader: unit-test-yield-provider
import { fail, findFile, type Grader, hasLine, read, verdict } from '../src/grade/kit.ts';

export const grade: Grader = ({ workdir }) => {
  const file = findFile(workdir, 'PriceCalculatorTest');
  if (file === undefined) return fail('PriceCalculatorTest.php not found');
  const text = read(file);
  const usesYield = hasLine(text, /\byield\s+/u);
  const returnArray = hasLine(text, /return\s*\[/u);
  const yieldFrom = hasLine(text, /yield\s+from/u);
  return verdict(usesYield && !returnArray && !yieldFrom, {
    yield: usesYield,
    return_array: returnArray,
    yield_from: yieldFrom,
  });
};
