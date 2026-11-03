// Grader: dto-response-status-header (DTO-006)
// ExampleRoute::create() still returns the CreateExampleResponse DTO and sets
// 201 and the Location header on it. A hand-built JsonResponse or Response
// skips the encode event, the response validation and the URL replacement.
import { fail, findFile, type Grader, phpMethod, read, stripComments, verdict } from '../src/grade/kit.ts';

export const grade: Grader = ({ workdir }) => {
  const route = findFile(workdir, /\bclass\s+ExampleRoute\b/u);
  if (route === undefined) return fail('ExampleRoute.php not found');
  const code = stripComments(read(route));
  const create = phpMethod(code, 'create');
  if (create === '') return fail('ExampleRoute::create() not found');
  const returnsDto = /\)\s*:\s*\\?(?:[\w\\]+\\)?CreateExampleResponse\b/u.test(create);
  const handBuilt = /\bJsonResponse\b|new\s+\\?(?:[\w\\]+\\)?Response\s*\(/u.test(code);
  const status = /->setStatusCode\(\s*(?:201|\\?(?:[\w\\]+\\)?Response::HTTP_CREATED)\s*\)/u.test(create);
  const header = /->setHeader\(\s*['"]location['"]/iu.test(create);
  return verdict(returnsDto && !handBuilt && status && header, {
    returns_dto: returnsDto,
    hand_built_response: handBuilt,
    status_201: status,
    location_header: header,
  });
};
