// Grader: storefront-media-thumbnails
import { basename } from 'node:path';
import { fail, filesUnder, type Grader, hasLine, read, stripComments, verdict } from '../src/grade/kit.ts';

export const grade: Grader = ({ workdir }) => {
  const file = filesUnder(workdir).find((f) => basename(f) === 'product-box.html.twig');
  if (file === undefined) return fail('product-box.html.twig not found');
  const code = stripComments(read(file));
  const thumbnails = hasLine(code, /sw_thumbnails/u);
  const mediaSrcset = hasLine(code, /cover\.media/u) && hasLine(code, /srcset/iu);
  const cdn = hasLine(code, /https:\/\/cdn\.example\/product\.jpg/u);
  return verdict((thumbnails || mediaSrcset) && !cdn, { thumbnails, media_srcset: mediaSrcset, cdn });
};
