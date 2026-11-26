// Grader: unit-test-exception-object
// PASS when InvalidQuantityValidatorTest calls expectExceptionObject() in real
// code (comments stripped) without expectExceptionMessage(), #[Depends], any(),
// or kernel/integration test traits.
import { fail, findFile, type Grader, hasLine, read, stripComments, verdict } from '../src/grade/kit.ts';

export const grade: Grader = ({ workdir }) => {
  const file = findFile(workdir, 'InvalidQuantityValidatorTest');
  if (file === undefined) return fail('InvalidQuantityValidatorTest.php not found');
  const code = stripComments(read(file));
  const object = hasLine(code, /expectExceptionObject\s*\(/u);
  const message = hasLine(code, /expectExceptionMessage\s*\(/u);
  const depends = hasLine(code, /#\[Depends\b/u);
  const any = hasLine(code, /\bany\s*\(/u);
  const kernel = hasLine(code, /IntegrationTestBehaviour|KernelTestBehaviour|getContainer\s*\(/u);
  return verdict(object && !message && !depends && !any && !kernel, { object, message, depends, any, kernel });
};
