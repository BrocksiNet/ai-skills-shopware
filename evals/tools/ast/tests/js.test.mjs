import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  exportDefaultHasStringProp,
  hasExportDefault,
  hasImportSourceContaining,
  hasImportSourceMatching,
  importSourceEndsWithSegment,
  parseJs,
} from '../src/js.mjs';
import { evaluateImpl, evaluateMain } from '../src/tasks/admin-js-implementation-to-ts.mjs';
import { evaluateOrders } from '../src/tasks/admin-no-cross-module-import.mjs';

test('commented import is not an ImportDeclaration', () => {
  const ast = parseJs("// import './module/swag-example/product-card/product-card';\n");
  assert.equal(hasImportSourceContaining(ast, 'product-card'), false);
  assert.equal(evaluateMain(ast), 0);
});

test('static import of product-card counts', () => {
  const ast = parseJs("import './module/swag-example/product-card/product-card';\n");
  assert.equal(evaluateMain(ast), 1);
});

test('dynamic import of product-card counts', () => {
  const ast = parseJs("await import('./module/swag-example/product-card/product-card');\n");
  assert.equal(evaluateMain(ast), 1);
});

test('export default object with component name passes', () => {
  const ast = parseJs(`export default {
    name: 'swag-example-product-card',
};
`);
  assert.equal(hasExportDefault(ast), true);
  assert.equal(exportDefaultHasStringProp(ast, 'name', 'swag-example-product-card'), true);
  assert.equal(evaluateImpl(ast), 1);
});

test('name only in a leftover object without export default fails', () => {
  const ast = parseJs(`const leftover = { name: 'swag-example-product-card' };\n`);
  assert.equal(evaluateImpl(ast), 0);
});

test('nested name under the default export does not count', () => {
  const ast = parseJs(`export default {
    metadata: { name: 'swag-example-product-card' },
};
`);
  assert.equal(exportDefaultHasStringProp(ast, 'name', 'swag-example-product-card'), false);
  assert.equal(evaluateImpl(ast), 0);
});

test('defineComponent object argument still counts as the export shape', () => {
  const ast = parseJs(`export default defineComponent({
    name: 'swag-example-product-card',
});
`);
  assert.equal(evaluateImpl(ast), 1);
});

test('unparseable JS is null, not a throw', () => {
  assert.equal(parseJs('export default {'), null);
});

test('substring product-card in another filename is not a segment match', () => {
  assert.equal(importSourceEndsWithSegment('./not-product-card', 'product-card'), false);
  assert.equal(importSourceEndsWithSegment('./module/swag-example/product-card/product-card', 'product-card'), true);
  const ast = parseJs("import './module/swag-example/product-card/not-product-card';\n");
  assert.equal(hasImportSourceContaining(ast, 'product-card'), true);
  assert.equal(evaluateMain(ast), 0);
});

test('exact product-card path segment still counts', () => {
  const ast = parseJs("import './module/swag-example/product-card/product-card.ts';\n");
  assert.equal(evaluateMain(ast), 1);
  assert.equal(
    hasImportSourceMatching(ast, (source) => importSourceEndsWithSegment(source, 'product-card')),
    true,
  );
});

test('cross-module import from swag-example-products is detected', () => {
  const ast = parseJs("import OrderLine from '../swag-example-products/order-line';\n");
  assert.equal(evaluateOrders(ast).cross, 1);
});

test('Shopware.Component lookup is not a cross-module import', () => {
  const ast = parseJs("const OrderLine = Shopware.Component.get('swag-example-products-order-line');\n");
  assert.equal(evaluateOrders(ast).cross, 0);
});
