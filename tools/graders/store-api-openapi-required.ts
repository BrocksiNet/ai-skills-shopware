// Grader: store-api-openapi-required
// PASS when ExampleRoute declares a real #[Route(...)] attribute and a real
// OpenApi attribute (not merely an unused import or comment).
import { fail, findFile, type Grader, hasLine, read, stripComments, verdict } from '../src/grade/kit.ts';

export const grade: Grader = ({ workdir }) => {
  const file = findFile(workdir, 'ExampleRoute');
  if (file === undefined) return fail('ExampleRoute.php not found');
  const code = stripComments(read(file));
  const route = hasLine(code, /#\[(?:\\?Symfony\\Component\\Routing\\Attribute\\)?Route\s*\(/u);
  const oaImport = hasLine(code, /\buse\s+OpenApi\\(?:Attributes|Annotations)\b/u);
  const openapi =
    hasLine(code, /#\[(?:\\?OpenApi\\(?:Attributes|Annotations)\\|OA\\)[A-Z]\w*\s*\(/u) ||
    (oaImport && hasLine(code, /#\[(?:Get|Post|Put|Patch|Delete|Response|RequestBody|Parameter|Tag)\s*\(/u));
  return verdict(route && openapi, { route, openapi });
};
