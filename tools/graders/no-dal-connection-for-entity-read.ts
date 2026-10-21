// Grader: no-dal-connection-for-entity-read
import { fail, findFile, type Grader, hasLine, read, verdict } from '../src/grade/kit.ts';

export const grade: Grader = ({ workdir }) => {
  const file = findFile(workdir, 'OrderReader');
  if (file === undefined) return fail('OrderReader.php not found');
  const text = read(file);
  const connection = hasLine(text, /Doctrine\\DBAL\\Connection|->fetchAllAssociative|->fetchAssociative/u);
  const repo = hasLine(text, /EntityRepository|->search\s*\(/u);
  return verdict(!connection && repo, { connection, repo });
};
