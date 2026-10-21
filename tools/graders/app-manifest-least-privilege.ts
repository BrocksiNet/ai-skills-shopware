// Grader: app-manifest-least-privilege
import { basename } from 'node:path';
import { fail, filesUnder, type Grader, hasLine, read, verdict } from '../src/grade/kit.ts';

export const grade: Grader = ({ workdir }) => {
  const file = filesUnder(workdir).find((f) => basename(f) === 'manifest.xml' && hasLine(read(f), /./u));
  if (file === undefined) return fail('manifest.xml not found');
  const text = read(file);
  const wildcard = hasLine(
    text,
    /<create>all<\/create>|<read>all<\/read>|<update>all<\/update>|<delete>all<\/delete>/u,
  );
  const specific = text.includes('product:read') && text.includes('order:read');
  return verdict(!wildcard && specific, { wildcard, specific });
};
