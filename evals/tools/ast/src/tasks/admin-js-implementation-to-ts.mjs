import { readFileSync } from 'node:fs';
import { findFiles, pathEndsWith } from '../files.mjs';
import {
  exportDefaultHasStringProp,
  hasExportDefault,
  hasImportSourceContaining,
  parseJs,
} from '../js.mjs';

export function evaluateMain(ast) {
  return hasImportSourceContaining(ast, 'product-card') ? 1 : 0;
}

export function evaluateImpl(ast) {
  if (!ast) {
    return 0;
  }
  return hasExportDefault(ast) && exportDefaultHasStringProp(ast, 'name', 'swag-example-product-card')
    ? 1
    : 0;
}

export function grade({ workdir }) {
  const implTs = findFiles(workdir, (path) => pathEndsWith(path, '/product-card.ts') || pathEndsWith(path, 'product-card.ts'));
  const implJs = findFiles(workdir, (path) => pathEndsWith(path, '/product-card.js') || pathEndsWith(path, 'product-card.js'));
  const mainJs = findFiles(workdir, (path) => pathEndsWith(path, '/administration/src/main.js'));
  const mainTs = findFiles(workdir, (path) => pathEndsWith(path, '/administration/src/main.ts'));

  const hasImplTs = implTs.length > 0 ? 1 : 0;
  const hasImplJs = implJs.length > 0 ? 1 : 0;
  const hasMainJs = mainJs.length > 0 ? 1 : 0;
  const hasMainTs = mainTs.length > 0 ? 1 : 0;

  let hasExport = 0;
  if (hasImplTs === 1) {
    const ast = parseFile(implTs[0]);
    if (!ast) {
      return { score: 0, detail: 'parse_error' };
    }
    hasExport = evaluateImpl(ast);
  }

  let mainImports = 0;
  if (hasMainJs === 1) {
    const ast = parseFile(mainJs[0]);
    if (!ast) {
      return { score: 0, detail: 'parse_error' };
    }
    mainImports = evaluateMain(ast);
  }

  const score =
    hasImplTs === 1 &&
    hasImplJs === 0 &&
    hasMainJs === 1 &&
    hasMainTs === 0 &&
    hasExport === 1 &&
    mainImports === 1
      ? 1
      : 0;

  return {
    score,
    detail: `impl_ts=${hasImplTs} impl_js=${hasImplJs} main_js=${hasMainJs} main_ts=${hasMainTs} export=${hasExport} import=${mainImports}`,
  };
}

function parseFile(path) {
  try {
    return parseJs(readFileSync(path, 'utf8'), path);
  } catch {
    return null;
  }
}
