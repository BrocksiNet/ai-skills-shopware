// Grader: store-api-route-extension-event (ARCH-004)
// The route class itself (not ProductBadgeRouteExtension or another class
// whose name starts the same) publishes through ExtensionDispatcher, and no
// abstract route class is left.
import { fail, filesUnder, type Grader, read, stripComments, verdict } from '../src/grade/kit.ts';

const ROUTE = /\bclass\s+ProductBadgeRoute\b/u;

/** The source of the class declared at `start`, through its closing brace. */
function classAt(code: string, start: number): string {
  let depth = 0;
  for (let i = code.indexOf('{', start); i !== -1 && i < code.length; i += 1) {
    if (code[i] === '{') depth += 1;
    else if (code[i] === '}') {
      depth -= 1;
      if (depth === 0) return code.slice(start, i + 1);
    }
  }
  return code.slice(start);
}

export const grade: Grader = ({ workdir }) => {
  const sources = filesUnder(workdir)
    .filter((f) => f.endsWith('.php'))
    .map((f) => stripComments(read(f)));
  const code = sources.find((s) => ROUTE.test(s));
  const match = code === undefined ? null : ROUTE.exec(code);
  if (code === undefined || match === null) return fail('class ProductBadgeRoute not found');
  const route = classAt(code, match.index);
  const header = route.slice(0, route.indexOf('{'));
  const abstract =
    /\babstract\s+$/u.test(code.slice(0, match.index)) ||
    /\bextends\s+\\?\w*Abstract/u.test(header) ||
    sources.some((s) => /\bclass\s+AbstractProductBadgeRoute\b/u.test(s));
  const extension = /\bExtensionDispatcher\b/u.test(route) && /->\s*publish\s*\(/u.test(route);
  return verdict(!abstract && extension, { abstract, extension });
};
