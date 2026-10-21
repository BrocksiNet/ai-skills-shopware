// Grader: storefront-twig-block-snippet
import { basename } from 'node:path';
import { fail, filesUnder, flat, type Grader, hasLine, read, verdict } from '../src/grade/kit.ts';

export const grade: Grader = ({ workdir }) => {
  const file = filesUnder(workdir).find((f) => basename(f) === 'buy-widget.html.twig');
  if (file === undefined) return fail('buy-widget.html.twig not found');
  const text = read(file);
  // grep -q without -E: `.` matches any character.
  const extendsBase = hasLine(
    text,
    /sw_extends '@Storefront\/storefront\/page\/product-detail\/buy-widget.html.twig'/u,
  );
  // Block name and snippet must sit in the same block declaration.
  const block =
    /\{%\s*block\s+page_product_detail_buy_button\s*%\}.*swag-example\.addToCart'\|trans.*\{%\s*endblock/u.test(
      flat(text),
    );
  const hardcoded = hasLine(text, /Add to cart/iu);
  const fullCopy = text.includes('page_product_detail_buy_form') && text.includes('page_product_detail_buy_quantity');
  return verdict(extendsBase && block && !hardcoded && !fullCopy, {
    extends: extendsBase,
    block,
    snippet: block,
    hardcoded,
    full_copy: fullCopy,
  });
};
