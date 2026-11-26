// Grader: test-class-has-package-attribute
// PASS when CartNormalizerTest carries real #[Package('checkout.cart')] and
// #[CoversClass(CartNormalizer::class)] attributes (comments stripped).
import { fail, findFile, type Grader, hasLine, read, stripComments, verdict } from '../src/grade/kit.ts';

export const grade: Grader = ({ workdir }) => {
  const file = findFile(workdir, 'CartNormalizerTest');
  if (file === undefined) return fail('CartNormalizerTest.php not found');
  const code = stripComments(read(file));
  const packageAttr = hasLine(
    code,
    /#\[(?:\\?Shopware\\Core\\Framework\\Log\\)?Package\s*\(\s*['"]checkout\.cart['"]\s*\)\]/u,
  );
  const packageImport =
    hasLine(code, /\buse\s+Shopware\\Core\\Framework\\Log\\Package\s*;/u) ||
    hasLine(code, /#\[\\Shopware\\Core\\Framework\\Log\\Package\s*\(/u);
  const covers = hasLine(
    code,
    /#\[(?:\\?PHPUnit\\Framework\\Attributes\\)?CoversClass\s*\(\s*CartNormalizer::class\s*\)\]/u,
  );
  return verdict(packageAttr && packageImport && covers, {
    package_attr: packageAttr,
    package_import: packageImport,
    covers,
  });
};
