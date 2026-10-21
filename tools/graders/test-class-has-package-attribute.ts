// Grader: test-class-has-package-attribute
import { fail, findFile, type Grader, hasLine, read, verdict } from '../src/grade/kit.ts';

export const grade: Grader = ({ workdir }) => {
  const file = findFile(workdir, 'CartNormalizerTest');
  if (file === undefined) return fail('CartNormalizerTest.php not found');
  const text = read(file);
  const packageAttr = hasLine(text, /#\[Package\(['"]checkout\.cart['"]\)\]/u);
  const packageImport = text.includes(String.raw`use Shopware\Core\Framework\Log\Package`);
  const covers = text.includes('#[CoversClass(CartNormalizer::class)]');
  return verdict(packageAttr && packageImport && covers, {
    package_attr: packageAttr,
    package_import: packageImport,
    covers,
  });
};
