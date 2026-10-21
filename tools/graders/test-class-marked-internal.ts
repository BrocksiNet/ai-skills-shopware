// Grader: test-class-marked-internal
import { fail, findFile, flat, type Grader, hasLine, read, verdict } from '../src/grade/kit.ts';

export const grade: Grader = ({ workdir }) => {
  const file = findFile(workdir, 'CartNormalizerTest');
  if (file === undefined) return fail('CartNormalizerTest.php not found');
  const text = read(file);
  const internal = /\/\*\*.*@internal.*\*\/\s*(#\[[^\]]+\]\s*)*final class CartNormalizerTest/u.test(flat(text));
  const pkg = hasLine(text, /#\[Package\(['"]checkout\.cart['"]\)\]/u);
  const covers = hasLine(text, /#\[CoversClass\(CartNormalizer::class\)\]/u);
  return verdict(internal && pkg && covers, { internal, package: pkg, covers });
};
