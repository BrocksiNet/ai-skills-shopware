// Grader: safeguard-test-not-in-unit-suite
// PASS when the safeguard test moved out of tests/unit/ into tests/devops/ and
// carries a real #[CoversNothing] attribute (not only a comment or #[CoversClass]).
import { existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { type Grader, hasLine, read, stripComments, verdict } from '../src/grade/kit.ts';

const TEST = 'Core/Framework/Mcp/McpDiscoveryScanDirsConfigTest.php';
const isFile = (path: string): boolean => existsSync(path) && statSync(path).isFile();

export const grade: Grader = ({ workdir }) => {
  const unit = join(workdir, 'tests/unit', TEST);
  const devops = join(workdir, 'tests/devops', TEST);
  const unitPresent = isFile(unit);
  const devopsPresent = isFile(devops);
  const code = devopsPresent ? stripComments(read(devops)) : '';
  const coversNothing = hasLine(code, /#\[\\?(?:PHPUnit\\Framework\\Attributes\\)?CoversNothing\]/u);
  const coversClass = hasLine(code, /#\[\\?(?:PHPUnit\\Framework\\Attributes\\)?CoversClass\b/u);
  const pass = !unitPresent && devopsPresent && coversNothing && !coversClass;
  return verdict(pass, {
    unit_present: unitPresent,
    devops_present: devopsPresent,
    covers_nothing: coversNothing,
    covers_class: coversClass,
  });
};
