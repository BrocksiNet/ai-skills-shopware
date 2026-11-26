// Grader: store-api-route-missing-acl
// PASS when ProtectedRoute declares ACL/privilege metadata in real code
// (comments stripped), not only in a docblock or comment.
import { fail, findFile, type Grader, hasLine, read, stripComments, verdict } from '../src/grade/kit.ts';

export const grade: Grader = ({ workdir }) => {
  const file = findFile(workdir, 'ProtectedRoute');
  if (file === undefined) return fail('ProtectedRoute.php not found');
  const code = stripComments(read(file));
  const acl = hasLine(code, /['"]_acl['"]|PlatformRequest::ATTRIBUTE_ACL|\bAcl::|#\[Acl\s*\(|->isAllowed\s*\(/u);
  return verdict(acl, { acl });
};
