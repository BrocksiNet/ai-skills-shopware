// Grader: test-docblock-use-see
import { fail, findFile, type Grader, read, verdict } from '../src/grade/kit.ts';

const FQCN = String.raw`Shopware\Tests\Unit\Core\Framework\Mcp\McpDiscoveryScanDirsConfigTest`;

export const grade: Grader = ({ workdir }) => {
  const file = findFile(workdir, 'McpStorefrontServiceConfigTest');
  if (file === undefined) return fail('McpStorefrontServiceConfigTest.php not found');
  const text = read(file);
  const see = text.includes('@see McpDiscoveryScanDirsConfigTest');
  const use = text.includes(`use ${FQCN}`);
  const fqcnProse = text.includes(`\\${FQCN}`);
  return verdict(see && use && !fqcnProse, { see, use, fqcn_prose: fqcnProse });
};
