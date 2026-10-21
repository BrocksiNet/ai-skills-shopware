// Grader: store-api-route-missing-acl
import { fail, findFile, type Grader, hasLine, read, verdict } from '../src/grade/kit.ts';

export const grade: Grader = ({ workdir }) => {
  const file = findFile(workdir, 'ProtectedRoute');
  if (file === undefined) return fail('ProtectedRoute.php not found');
  const acl = hasLine(read(file), /_acl|Acl|privilege|Administration::/u);
  return verdict(acl, { acl });
};
