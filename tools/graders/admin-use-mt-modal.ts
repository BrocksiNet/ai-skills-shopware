// Grader: admin-use-mt-modal
import { fail, filesUnder, type Grader, hasLine, read, stripComments, verdict } from '../src/grade/kit.ts';

const SOURCE = /\.(?:ts|js|vue)$/u;
const SUBJECT = /ProductDeleteModal|product-delete-modal/u;

export const grade: Grader = ({ workdir }) => {
  const file = filesUnder(workdir).find((f) => SOURCE.test(f) && hasLine(read(f), SUBJECT));
  if (file === undefined) return fail('product-delete-modal not found');
  const code = stripComments(read(file));
  // Starting fixture has no local sw-modal; require the Meteor tag in markup.
  const meteor = hasLine(code, /<mt-modal[\s/>]/u);
  const native = hasLine(
    code,
    /<dialog|HTMLDialogElement|showModal\s*\(|popovertarget|\spopover=|\spopover[\s>]|showPopover\s*\(|togglePopover\s*\(/u,
  );
  return verdict(meteor && !native, { meteor, native });
};
