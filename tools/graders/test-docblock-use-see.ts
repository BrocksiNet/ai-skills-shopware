// Grader: test-docblock-use-see
// PASS when McpStorefrontServiceConfigTest imports the sibling test with a real
// PHP `use` statement (comments stripped) and references its short name in @see.
import { fail, findFile, type Grader, hasLine, read, stripComments, verdict } from '../src/grade/kit.ts';

const FQCN = String.raw`Shopware\Tests\Unit\Core\Framework\Mcp\McpDiscoveryScanDirsConfigTest`;
const FQCN_RE = FQCN.replaceAll('\\', String.raw`\\`);

export const grade: Grader = ({ workdir }) => {
  const file = findFile(workdir, 'McpStorefrontServiceConfigTest');
  if (file === undefined) return fail('McpStorefrontServiceConfigTest.php not found');
  const raw = read(file);
  const code = stripComments(raw);
  const see = hasLine(raw, /\*\s*@see\s+McpDiscoveryScanDirsConfigTest\b/u);
  const use = hasLine(code, new RegExp(String.raw`\buse\s+${FQCN_RE}\s*;`, 'u'));
  const fqcnProse = raw.includes(`\\${FQCN}`) || hasLine(raw, new RegExp(String.raw`@see\s+\\?${FQCN_RE}`, 'u'));
  return verdict(see && use && !fqcnProse, { see, use, fqcn_prose: fqcnProse });
};
