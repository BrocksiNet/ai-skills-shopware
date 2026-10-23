// Grader: admin-component-wrap-config (ADM-041, ADM-007)
//
// Pass: the new sw-stock-badge component is TypeScript, its default export is
// a wrapComponentConfig({...}) call, it uses no mixin, it calls the
// useNotification composable, and the module registers it.
import { readFileSync } from 'node:fs';
import traverseMod from '@babel/traverse';
import { findFiles, pathEndsWith } from '../files.mjs';
import { hasImportSourceMatching, importSourceEndsWithSegment, parseJs } from '../js.mjs';

const traverse = traverseMod.default ?? traverseMod;

const COMPONENT_DIR = '/module/sw-stock/component/sw-stock-badge/';

const propName = (node) =>
  node?.type === 'Identifier' ? node.name : node?.type === 'StringLiteral' ? node.value : null;

/** `Shopware.Component.wrapComponentConfig`, `Component.wrapComponentConfig`
 *  or a bare `wrapComponentConfig` taken from `Shopware.Component`. */
function isWrapCallee(callee) {
  if (callee?.type === 'Identifier') {
    return callee.name === 'wrapComponentConfig';
  }
  return callee?.type === 'MemberExpression' && propName(callee.property) === 'wrapComponentConfig';
}

/** `Mixin.x(...)` or `Shopware.Mixin.x(...)`. */
function isMixinCall(callee) {
  if (callee?.type !== 'MemberExpression') {
    return false;
  }
  const obj = callee.object;
  return (
    (obj.type === 'Identifier' && obj.name === 'Mixin') ||
    (obj.type === 'MemberExpression' && propName(obj.property) === 'Mixin')
  );
}

/** 1 when the default export is wrapComponentConfig({...}) without `mixins`. */
export function evaluateWrap(ast) {
  if (!ast) {
    return 0;
  }
  let ok = 0;
  traverse(ast, {
    ExportDefaultDeclaration(path) {
      const decl = path.node.declaration;
      if (decl?.type !== 'CallExpression' || !isWrapCallee(decl.callee)) {
        return;
      }
      const options = decl.arguments[0];
      if (options?.type !== 'ObjectExpression') {
        return;
      }
      const hasMixins = options.properties.some(
        (p) => (p.type === 'ObjectProperty' || p.type === 'ObjectMethod') && propName(p.key) === 'mixins',
      );
      ok = hasMixins ? 0 : 1;
    },
  });
  return ok;
}

/** 1 when no `Mixin.*()` call is in the file. */
export function evaluateNoMixin(ast) {
  if (!ast) {
    return 0;
  }
  let found = false;
  traverse(ast, {
    CallExpression(path) {
      if (isMixinCall(path.node.callee)) {
        found = true;
      }
    },
  });
  return found ? 0 : 1;
}

/** 1 when the file calls the notification composable, imported from
 *  `use-notification` under any local name. A comment does not count. */
export function evaluateComposable(ast) {
  if (!ast) {
    return 0;
  }
  const names = new Set(['useNotification']);
  for (const node of ast.program.body) {
    if (node.type === 'ImportDeclaration' && importSourceEndsWithSegment(node.source.value, 'use-notification')) {
      for (const spec of node.specifiers) {
        names.add(spec.local.name);
      }
    }
  }
  let called = false;
  traverse(ast, {
    CallExpression(path) {
      const callee = path.node.callee;
      if (callee.type === 'Identifier' && names.has(callee.name)) {
        called = true;
      }
    },
  });
  return called ? 1 : 0;
}

export function evaluateRegistration(ast) {
  return hasImportSourceMatching(ast, (source) => importSourceEndsWithSegment(source, 'sw-stock-badge')) ? 1 : 0;
}

export function grade({ workdir }) {
  const ts = findFiles(workdir, (path) => pathEndsWith(path, `${COMPONENT_DIR}index.ts`));
  const js = findFiles(workdir, (path) => pathEndsWith(path, `${COMPONENT_DIR}index.js`));
  const moduleIndex = findFiles(workdir, (path) => /\/module\/sw-stock\/index\.(ts|js)$/.test(path));

  const hasTs = ts.length > 0 ? 1 : 0;
  const hasJs = js.length > 0 ? 1 : 0;
  let wrap = 0;
  let noMixin = 0;
  let composable = 0;
  if (hasTs === 1) {
    const ast = parseFile(ts[0]);
    if (!ast) {
      return { score: 0, detail: 'parse_error' };
    }
    wrap = evaluateWrap(ast);
    noMixin = evaluateNoMixin(ast);
    composable = evaluateComposable(ast);
  }
  const registered = moduleIndex.length > 0 ? evaluateRegistration(parseFile(moduleIndex[0])) : 0;

  const score = hasTs === 1 && hasJs === 0 && wrap === 1 && noMixin === 1 && composable === 1 && registered === 1 ? 1 : 0;
  return {
    score,
    detail: `ts=${hasTs} js=${hasJs} wrap=${wrap} no_mixin=${noMixin} composable=${composable} registered=${registered}`,
  };
}

function parseFile(path) {
  try {
    return parseJs(readFileSync(path, 'utf8'), path);
  } catch {
    return null;
  }
}
