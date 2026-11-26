// Grader: no-access-key-in-source
// PASS when StoreApiConfig reads the access key from environment/config in real
// code (not a comment) and has no hardcoded access key literal.
import { fail, findFile, type Grader, hasLine, read, stripComments, verdict } from '../src/grade/kit.ts';

export const grade: Grader = ({ workdir }) => {
  const file = findFile(workdir, 'StoreApiConfig');
  if (file === undefined) return fail('StoreApiConfig.php not found');
  const code = stripComments(read(file));
  // 32-char hex or SWSC-prefixed sales channel access keys
  const hardcoded = hasLine(code, /['"]SWSC[A-Z0-9]{20,}['"]|accessKey\s*=\s*['"][0-9a-fA-F]{16,}['"]/u);
  const env = hasLine(code, /getenv\s*\(|%env\(|EnvironmentInterface|\$_ENV|\$_SERVER/u);
  return verdict(!hardcoded && env, { hardcoded, env });
};
