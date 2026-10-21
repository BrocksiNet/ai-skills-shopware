// Grader: static-entity-repository-stub
import { fail, findFile, flat, type Grader, hasLine, read, verdict } from '../src/grade/kit.ts';

export const grade: Grader = ({ workdir }) => {
  const file = findFile(workdir, 'ProductLoaderTest');
  if (file === undefined) return fail('ProductLoaderTest.php not found');
  const text = read(file);
  const oneLine = flat(text);
  const wired =
    // $repo = StaticEntityRepository::of(...); new ProductLoader($repo)
    /\$([A-Za-z_][A-Za-z0-9_]*)\s*=\s*StaticEntityRepository::of\s*\(\s*ProductCollection::class.*new ProductLoader\s*\(\s*\$\1/u.test(
      oneLine,
    ) ||
    // new ProductLoader(StaticEntityRepository::of(...))
    /new ProductLoader\s*\(\s*StaticEntityRepository::of\s*\(\s*ProductCollection::class/u.test(oneLine);
  const double = hasLine(text, /createMock\s*\(|createStub\s*\(|getMockBuilder\s*\(/u);
  // Assertion must observe ProductLoader::load(), not a tautology on the expected string.
  const assert =
    /assertSame\s*\(\s*'swag-example-product-a'\s*,\s*\$[A-Za-z_][A-Za-z0-9_]*->load\s*\(/u.test(oneLine) ||
    /\$([A-Za-z_][A-Za-z0-9_]*)\s*=\s*\$[A-Za-z_][A-Za-z0-9_]*->load\s*\([^;]*assertSame\s*\(\s*'swag-example-product-a'\s*,\s*\$\1/u.test(
      oneLine,
    );
  return verdict(wired && !double && assert, { wired, double, assert });
};
