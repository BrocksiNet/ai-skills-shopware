// Grader: integration-no-covers-class
import { fail, findFile, type Grader, hasLine, read, verdict } from '../src/grade/kit.ts';

export const grade: Grader = ({ workdir }) => {
  const file = findFile(workdir, 'ProductLoaderIntegrationTest');
  if (file === undefined) return fail('ProductLoaderIntegrationTest.php not found');
  const text = read(file);
  const integration = hasLine(text, /IntegrationTestBehaviour/u);
  const coversAttr = hasLine(text, /CoversClass|CoversFunction|CoversNothing/u);
  return verdict(integration && !coversAttr, { integration, covers_attr: coversAttr });
};
