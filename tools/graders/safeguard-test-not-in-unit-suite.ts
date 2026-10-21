// Grader: safeguard-test-not-in-unit-suite
import { existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { type Grader, read, verdict } from '../src/grade/kit.ts';

const TEST = 'Core/Framework/Mcp/McpDiscoveryScanDirsConfigTest.php';
const isFile = (path: string): boolean => existsSync(path) && statSync(path).isFile();

export const grade: Grader = ({ workdir }) => {
  const unit = join(workdir, 'tests/unit', TEST);
  const devops = join(workdir, 'tests/devops', TEST);
  const unitPresent = isFile(unit);
  const devopsPresent = isFile(devops);
  const pass = !unitPresent && devopsPresent && read(devops).includes('CoversNothing');
  return verdict(pass, { unit_present: unitPresent, devops_present: devopsPresent });
};
