// Grader: deprecation-silent-wrapper
import { fail, findFile, type Grader, hasLine, read, verdict } from '../src/grade/kit.ts';

export const grade: Grader = ({ workdir }) => {
  const file = findFile(workdir, 'LegacyConfigReader');
  if (file === undefined) return fail('LegacyConfigReader.php not found');
  const text = read(file);
  const silent = hasLine(text, /Feature::silent\s*\(/u);
  const legacy = hasLine(text, /DeprecatedConfigLoader::loadLegacy\s*\(/u);
  const bareCall = hasLine(text, /return\s+DeprecatedConfigLoader::loadLegacy\s*\(/u);
  return verdict(silent && legacy && !bareCall, { silent, legacy, bare_call: bareCall });
};
