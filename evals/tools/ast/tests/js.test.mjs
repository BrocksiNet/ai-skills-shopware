import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  exportDefaultHasStringProp,
  hasExportDefault,
  hasImportSourceContaining,
  parseJs,
} from '../src/js.mjs';
import { evaluateImpl, evaluateMain } from '../src/tasks/admin-js-implementation-to-ts.mjs';

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

test('unparseable JS is null, not a throw', () => {
  assert.equal(parseJs('export default {'), null);
});
