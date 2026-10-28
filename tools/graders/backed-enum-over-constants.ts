// Grader: backed-enum-over-constants (PHP-002)
// The three moderation states are a backed string enum with the stored
// values, ProductReviewModerator takes that enum as a parameter type, and no
// class constant carries one of the values. Case names, the enum name and the
// file it lives in are the agent's choice.
import { fail, filesUnder, type Grader, read, stripComments, verdict } from '../src/grade/kit.ts';

const VALUES = ['pending', 'approved', 'rejected'];
const STATE_CONST = /\bconst\s+(?:string\s+)?\w+\s*=\s*'(?:pending|approved|rejected)'/u;

/** Backed string enums with a case for every stored value. */
function stateEnums(code: string): string[] {
  const out: string[] = [];
  for (const m of code.matchAll(/\benum\s+(\w+)\s*:\s*string\b/gu)) {
    const name = m[1];
    if (name === undefined) continue;
    // Up to the next enum: methods with braces may come before the cases.
    const rest = code.slice(m.index + m[0].length);
    const next = rest.search(/\benum\s+\w+/u);
    const body = next === -1 ? rest : rest.slice(0, next);
    if (VALUES.every((v) => new RegExp(String.raw`\bcase\s+\w+\s*=\s*'${v}'`, 'u').test(body))) out.push(name);
  }
  return out;
}

export const grade: Grader = ({ workdir }) => {
  const sources = filesUnder(workdir)
    .filter((f) => f.endsWith('.php'))
    .map((f) => stripComments(read(f)));
  const moderator = sources.find((code) => /\bclass\s+ProductReviewModerator\b/u.test(code));
  if (moderator === undefined) return fail('class ProductReviewModerator not found');
  const enums = sources.flatMap((code) => stateEnums(code));
  const typed = enums.some((name) =>
    new RegExp(String.raw`function\s+\w+\s*\([^)]*\??\\?(?:[\w\\]+\\)?${name}\s+\$\w+`, 'u').test(moderator),
  );
  const constants = sources.some((code) => STATE_CONST.test(code));
  return verdict(enums.length > 0 && typed && !constants, {
    enum: enums.length > 0,
    typed_param: typed,
    state_constants: constants,
  });
};
