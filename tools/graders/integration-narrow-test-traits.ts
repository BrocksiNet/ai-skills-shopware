// Grader: integration-narrow-test-traits
import { fail, findFile, type Grader, read, stripComments, verdict } from '../src/grade/kit.ts';

export const grade: Grader = ({ workdir }) => {
  const file = findFile(workdir, 'class ProductRepositoryTest');
  if (file === undefined) return fail('ProductRepositoryTest.php not found');
  const body = stripComments(read(file));
  const broad = body.includes('IntegrationTestBehaviour');
  const kernel = body.includes('KernelTestBehaviour');
  const tx = body.includes('DatabaseTransactionBehaviour');
  return verdict(!broad && kernel && tx, { broad, kernel, tx });
};
