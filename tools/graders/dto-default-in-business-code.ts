// Grader: dto-default-in-business-code (DTO-003)
// ExampleRoute::create() fills the response note from the request, checks
// presence with has('note') and falls back to the DEFAULT_NOTE constant. `??`
// or isset() on the note turns an explicit null into the default, and an
// initializer in a generated DTO hides the omission; both fail.
import { fail, findFile, type Grader, phpMethod, read, stripComments, verdict } from '../src/grade/kit.ts';

const INITIALIZED_NOTE = /\$note\s*=/u;

export const grade: Grader = ({ workdir }) => {
  const route = findFile(workdir, /\bclass\s+ExampleRoute\b/u);
  if (route === undefined) return fail('ExampleRoute.php not found');
  const create = phpMethod(read(route), 'create');
  if (create === '') return fail('ExampleRoute::create() not found');
  const assigns = /->note\s*=(?!=)/u.test(create);
  const has = /->has\(\s*['"]note['"]\s*\)/u.test(create);
  const constant = /::DEFAULT_NOTE\b/u.test(create);
  const loose = /->note\s*\?\?|isset\s*\([^)]*->note\b|empty\s*\([^)]*->note\b/u.test(create);
  const initialized = ['CreateExampleRequest', 'CreateExampleResponse'].some((name) => {
    const file = findFile(workdir, new RegExp(String.raw`\bclass\s+${name}\b`, 'u'));
    return file !== undefined && INITIALIZED_NOTE.test(stripComments(read(file)));
  });
  return verdict(assigns && has && constant && !loose && !initialized, {
    assigns_note: assigns,
    has_check: has,
    default_constant: constant,
    coalesce_or_isset: loose,
    dto_initializer: initialized,
  });
};
