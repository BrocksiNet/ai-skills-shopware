// Grader: store-api-openapi-required
import { fail, findFile, type Grader, hasLine, read, verdict } from '../src/grade/kit.ts';

export const grade: Grader = ({ workdir }) => {
  const file = findFile(workdir, 'ExampleRoute');
  if (file === undefined) return fail('ExampleRoute.php not found');
  const text = read(file);
  const route = hasLine(text, /Route\s*\(|#\[Route/u);
  const openapi = hasLine(text, /OpenApi\\|use OpenApi/u);
  return verdict(route && openapi, { route, openapi });
};
