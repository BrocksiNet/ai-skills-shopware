// Grader: no-reflection-on-shopware-method
import { fail, findFile, flat, type Grader, hasLine, read, verdict } from '../src/grade/kit.ts';

const ASSERTS = [
  // $result = (new PriceCalculator())->calculate(10.0); assertSame(11.0, $result)
  /\$([A-Za-z_][A-Za-z0-9_]*)\s*=\s*\(new PriceCalculator\(\)\)->calculate\s*\(\s*10(\.0)?\s*\).*assertSame\s*\(\s*11(\.0)?\s*,\s*\$\1\s*\)/u,
  // assertSame(11.0, (new PriceCalculator())->calculate(10.0))
  /assertSame\s*\(\s*11(\.0)?\s*,\s*\(new PriceCalculator\(\)\)->calculate\s*\(\s*10(\.0)?/u,
  // $calc = new PriceCalculator(); $result = $calc->calculate(10.0); assertSame(11.0, $result)
  /\$([A-Za-z_][A-Za-z0-9_]*)\s*=\s*new PriceCalculator\(\).*\$([A-Za-z_][A-Za-z0-9_]*)\s*=\s*\$\1->calculate\s*\(\s*10(\.0)?\s*\).*assertSame\s*\(\s*11(\.0)?\s*,\s*\$\2\s*\)/u,
  // $calc = new PriceCalculator(); assertSame(11.0, $calc->calculate(10.0))
  /\$([A-Za-z_][A-Za-z0-9_]*)\s*=\s*new PriceCalculator\(\).*assertSame\s*\(\s*11(\.0)?\s*,\s*\$\1->calculate\s*\(\s*10(\.0)?/u,
];

export const grade: Grader = ({ workdir }) => {
  const file = findFile(workdir, 'PriceCalculatorTest');
  if (file === undefined) return fail('PriceCalculatorTest.php not found');
  const text = read(file);
  const usesPublic = hasLine(text, /->calculate\s*\(\s*10(\.0)?/u);
  const reflection = hasLine(text, /ReflectionMethod|setAccessible\s*\(|->invoke(Args)?\s*\(/u);
  const oneLine = flat(text);
  const assert = ASSERTS.some((p) => p.test(oneLine));
  return verdict(usesPublic && assert && !reflection, { public: usesPublic, assert, reflection });
};
