// Grader: deprecation-silent-wrapper
// PASS when LegacyConfigReader::read() invokes DeprecatedConfigLoader::loadLegacy()
// inside Feature::silent(...) and makes no unwrapped call outside it.
import { fail, findFile, type Grader, jsCallArgs, phpMethod, read, verdict } from '../src/grade/kit.ts';

export const grade: Grader = ({ workdir }) => {
  const file = findFile(workdir, 'LegacyConfigReader');
  if (file === undefined) return fail('LegacyConfigReader.php not found');
  const body = phpMethod(read(file), 'read');
  if (body === '') return fail('LegacyConfigReader::read() not found');
  const silentArgs = jsCallArgs(body, 'Feature::silent');
  const silent = silentArgs !== '';
  const legacyInSilent = /DeprecatedConfigLoader::loadLegacy\s*\(/u.test(silentArgs);
  const outside = silent ? body.replace(silentArgs, '') : body;
  const bareCall = /DeprecatedConfigLoader::loadLegacy\s*\(/u.test(outside);
  return verdict(silent && legacyInSilent && !bareCall, {
    silent,
    legacy_in_silent: legacyInSilent,
    bare_call: bareCall,
  });
};
