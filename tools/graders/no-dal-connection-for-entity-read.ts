// Grader: no-dal-connection-for-entity-read
// PASS when OrderReader::loadOrderIds() reads through EntityRepository::search()
// or searchIds() in real code (comments stripped) and does not use DBAL Connection.
import { fail, findFile, type Grader, hasLine, phpMethod, read, stripComments, verdict } from '../src/grade/kit.ts';

export const grade: Grader = ({ workdir }) => {
  const file = findFile(workdir, 'OrderReader');
  if (file === undefined) return fail('OrderReader.php not found');
  const raw = read(file);
  const code = stripComments(raw);
  const method = phpMethod(raw, 'loadOrderIds');
  const connection = hasLine(
    code,
    /Doctrine\\DBAL\\Connection|->fetchAllAssociative|->fetchAssociative|->fetchFirstColumn|->executeQuery|->createQueryBuilder/u,
  );
  const repo = hasLine(code, /\bEntityRepository\b/u) && hasLine(method, /->search(?:Ids)?\s*\(/u);
  return verdict(!connection && repo, { connection, repo });
};
