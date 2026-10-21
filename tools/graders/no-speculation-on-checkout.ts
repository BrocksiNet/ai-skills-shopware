// Grader: no-speculation-on-checkout
import { fail, findFile, type Grader, hasLine, read, verdict } from '../src/grade/kit.ts';

export const grade: Grader = ({ workdir }) => {
  const file = findFile(workdir, /page_checkout_confirm|checkout\/confirm/u, '.twig');
  if (file === undefined) return fail('checkout twig not found');
  const text = read(file);
  const speculation = hasLine(text, /speculationrules|prerender|type="speculation/iu);
  const prefetch = hasLine(text, /prefetch|href_matches/iu);
  const keepsExtends = text.includes("sw_extends '@Storefront/storefront/page/checkout/confirm.html.twig'");
  const keepsParent = text.includes('{{ parent() }}');
  const keepsBlock = text.includes('page_checkout_confirm');
  return verdict(!speculation && !prefetch && keepsExtends && keepsParent && keepsBlock, {
    speculation,
    prefetch,
    extends: keepsExtends,
    parent: keepsParent,
    block: keepsBlock,
  });
};
