// Grader: mwg-only-after-shopware-primitive
import { basename, dirname, relative } from 'node:path';
import { fail, filesUnder, type Grader, hasLine, read, stripComments, verdict } from '../src/grade/kit.ts';

export const grade: Grader = ({ workdir }) => {
  const files = filesUnder(workdir);
  const file = files.find((f) => basename(f) === 'product-card.html.twig');
  if (file === undefined) return fail('product-card.html.twig not found');
  const code = stripComments(read(file));
  const bootstrap = hasLine(code, /data-bs-toggle="modal"|data-bs-target=/u);
  const native = hasLine(code, /<dialog|showModal\s*\(|popovertarget|\spopover=/u);
  // A modern-web-guidance skill the agent added: SKILL.md in a folder of
  // that name. The shell version tested both names on the file name, so it
  // never matched.
  const mwgSkill = files.some(
    (f) => basename(f) === 'SKILL.md' && /modern-web-guidance/iu.test(relative(workdir, dirname(f))),
  );
  return verdict(bootstrap && !native && !mwgSkill, { bootstrap, native, mwg_skill: mwgSkill });
};
