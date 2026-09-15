import { readFileSync } from 'node:fs';
import { findFiles } from '../files.mjs';
import { hasImportSourceMatching, parseJs } from '../js.mjs';

export function evaluateOrders(ast) {
  if (!ast) {
    return { cross: 0 };
  }
  const cross = hasImportSourceMatching(ast, (source) =>
    source.replaceAll('\\', '/').includes('swag-example-products'),
  )
    ? 1
    : 0;
  return { cross };
}

export function grade({ workdir }) {
  const ordersFiles = findFiles(
    workdir,
    (path) =>
      path.replaceAll('\\', '/').includes('/module/swag-example-orders/') &&
      (path.endsWith('.js') || path.endsWith('.ts')),
  );
  const productsFiles = findFiles(workdir, (path) =>
    path.replaceAll('\\', '/').includes('/module/swag-example-products/'),
  );

  const hasOrders = ordersFiles.length > 0 ? 1 : 0;
  const hasProducts = productsFiles.length > 0 ? 1 : 0;

  let cross = 0;
  for (const file of ordersFiles) {
    const ast = parseFile(file);
    if (!ast) {
      return { score: 0, detail: 'parse_error' };
    }
    if (evaluateOrders(ast).cross === 1) {
      cross = 1;
    }
  }

  const score = hasOrders === 1 && hasProducts === 1 && cross === 0 ? 1 : 0;
  return {
    score,
    detail: `orders=${hasOrders} products=${hasProducts} cross=${cross}`,
  };
}

function parseFile(path) {
  try {
    return parseJs(readFileSync(path, 'utf8'), path);
  } catch {
    return null;
  }
}
