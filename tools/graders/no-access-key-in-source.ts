// Grader: no-access-key-in-source
import { fail, findFile, type Grader, hasLine, read, verdict } from '../src/grade/kit.ts';

export const grade: Grader = ({ workdir }) => {
  const file = findFile(workdir, 'StoreApiConfig');
  if (file === undefined) return fail('StoreApiConfig.php not found');
  const text = read(file);
  // 32-char hex typical for sales channel access keys
  const hardcoded = hasLine(text, /['"]SWSC[A-Z0-9]{28,}['"]|accessKey\s*=\s*['"][0-9a-fA-F]{32}['"]/u);
  const env = hasLine(text, /getenv\s*\(|%env\(|EnvironmentInterface|\$_ENV/u);
  return verdict(!hardcoded && env, { hardcoded, env });
};
