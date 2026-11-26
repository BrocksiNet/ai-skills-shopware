// Grader: integration-no-covers-class
// PASS when ProductLoaderIntegrationTest uses IntegrationTestBehaviour in the
// class body and has no #[CoversClass]/#[CoversFunction]/#[CoversNothing]
// attribute or @covers/@coversNothing docblock annotation.
import { fail, findFile, type Grader, hasLine, read, stripComments, verdict } from '../src/grade/kit.ts';

export const grade: Grader = ({ workdir }) => {
  const file = findFile(workdir, 'ProductLoaderIntegrationTest');
  if (file === undefined) return fail('ProductLoaderIntegrationTest.php not found');
  const raw = read(file);
  const code = stripComments(raw);
  const classStart = code.search(/\bclass\s+ProductLoaderIntegrationTest\b/u);
  const classBody = classStart === -1 ? '' : code.slice(classStart);
  const integration = hasLine(
    classBody,
    /\buse\s+(?:\\?Shopware\\Core\\Framework\\Test\\TestCaseBase\\)?IntegrationTestBehaviour\s*;/u,
  );
  const coversAttr =
    hasLine(code, /CoversClass|CoversFunction|CoversNothing/u) || hasLine(raw, /@covers(?:Nothing)?\b/u);
  return verdict(integration && !coversAttr, { integration, covers_attr: coversAttr });
};
