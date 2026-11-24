// Grader: mwg-only-after-shopware-primitive
// The quick view keeps the Bootstrap modal (SF-003). An installed
// modern-web-guidance skill is allowed; a native dialog or popover in its
// place is not.
import { basename } from 'node:path';
import { fail, filesUnder, type Grader, hasLine, read, stripComments, verdict } from '../src/grade/kit.ts';

export const grade: Grader = ({ workdir }) => {
  const file = filesUnder(workdir).find((f) => basename(f) === 'product-card.html.twig');
  if (file === undefined) return fail('product-card.html.twig not found');
  const code = stripComments(read(file));
  const bootstrap = hasLine(code, /data-bs-toggle="modal"|data-bs-target=/u);
  const native = hasLine(code, /<dialog|showModal\s*\(|popovertarget|\spopover=/u);
  return verdict(bootstrap && !native, { bootstrap, native });
};
