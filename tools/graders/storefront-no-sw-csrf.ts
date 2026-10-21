// Grader: storefront-no-sw-csrf
import { basename } from 'node:path';
import { fail, filesUnder, type Grader, hasLine, read, verdict } from '../src/grade/kit.ts';

export const grade: Grader = ({ workdir }) => {
  const file = filesUnder(workdir).find((f) => basename(f) === 'login.html.twig');
  if (file === undefined) return fail('login.html.twig not found');
  const text = read(file);
  const route = hasLine(text, /path\s*\(\s*['"]frontend\.account\.login['"]/u);
  const method = hasLine(text, /method="post"/iu);
  const email = hasLine(text, /name="email"/u);
  const submit = hasLine(text, /account\.loginSubmit'|trans/u);
  const csrf = hasLine(text, /sw_csrf|_csrf_token|name="csrf/u);
  return verdict(route && method && email && submit && !csrf, { route, method, email, submit, csrf });
};
