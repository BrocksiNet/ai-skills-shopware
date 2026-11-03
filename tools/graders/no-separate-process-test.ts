// Grader: no-separate-process-test (TEST-037)
//
// The unit test for TelemetryOptOut must run in the shared PHPUnit process:
// no isolation attribute, docblock annotation or phpunit.xml switch anywhere
// under tests/. A test that changes the environment restores it, and the
// static cache in the class is reset between tests (a reset method, a
// reflection reset, or no static cache left in the class).
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { type Grader, fail, filesUnder, findPaths, read, stripComments, verdict } from '../src/grade/kit.ts';

const ISOLATION_ATTRIBUTE = /\b(?:RunInSeparateProcess|RunTestsInSeparateProcesses|RunClassInSeparateProcess)\b/u;
const ISOLATION_ANNOTATION = /@run(?:InSeparateProcess|TestsInSeparateProcesses|ClassInSeparateProcess)\b/iu;
const ISOLATION_CONFIG = /processIsolation\s*=\s*["']true["']/u;
const TOUCHES_ENV = /\bputenv\s*\(|\$_SERVER\s*\[|\$_ENV\s*\[/u;
const RESTORES =
  /function\s+tearDown\s*\(|#\[\s*(?:\\?PHPUnit\\Framework\\Attributes\\)?After\b|\bfinally\s*\{|\bEnvTestBehaviour\b/u;
const RESETS_CACHE = /\b\w*[Rr]eset\w*\s*\(|setStaticPropertyValue\s*\(/u;
const STATIC_CACHE = /\bstatic\s+\??\w+\s+\$optedOut\b/u;
const SOURCE = 'src/Core/Framework/Telemetry/TelemetryOptOut.php';

export const grade: Grader = ({ workdir }) => {
  const tests = findPaths(workdir, /^tests\/.+\.php$/u);
  const subject = tests.find((f) => f.endsWith('Test.php') && read(f).includes('TelemetryOptOut'));
  if (subject === undefined) return fail('no test under tests/ for TelemetryOptOut');
  const code = stripComments(read(subject));
  if (!code.includes('isOptedOut')) return fail('the test never calls isOptedOut()');
  const inUnit = subject.slice(workdir.length + 1).startsWith('tests/unit/');

  const isolated = tests.some(
    (f) => ISOLATION_ATTRIBUTE.test(stripComments(read(f))) || ISOLATION_ANNOTATION.test(read(f)),
  );
  const config = filesUnder(workdir).some((f) => /phpunit\.xml(?:\.dist)?$/u.test(f) && ISOLATION_CONFIG.test(read(f)));

  const touchesEnv = TOUCHES_ENV.test(code);
  const restores = !touchesEnv || RESTORES.test(code);

  const source = join(workdir, SOURCE);
  const staticCache = existsSync(source) && STATIC_CACHE.test(stripComments(read(source)));
  const resetsCache = !staticCache || RESETS_CACHE.test(code);

  return verdict(inUnit && !isolated && !config && restores && resetsCache, {
    in_unit_suite: inUnit,
    separate_process: isolated,
    isolation_config: config,
    restores_env: restores,
    resets_cache: resetsCache,
  });
};
