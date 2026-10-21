// Grader: unit-test-exception-object
import { fail, findFile, type Grader, hasLine, read, verdict } from '../src/grade/kit.ts';

export const grade: Grader = ({ workdir }) => {
  const file = findFile(workdir, 'InvalidQuantityValidatorTest');
  if (file === undefined) return fail('InvalidQuantityValidatorTest.php not found');
  const text = read(file);
  const object = hasLine(text, /expectExceptionObject\s*\(/u);
  const message = hasLine(text, /expectExceptionMessage\s*\(/u);
  const depends = hasLine(text, /#\[Depends\]/u);
  const any = hasLine(text, /\bany\s*\(/u);
  const kernel = hasLine(text, /IntegrationTestBehaviour|KernelTestBehaviour|getContainer\s*\(/u);
  return verdict(object && !message && !depends && !any && !kernel, { object, message, depends, any, kernel });
};
