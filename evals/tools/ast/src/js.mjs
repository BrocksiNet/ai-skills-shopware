import { parse } from '@babel/parser';
import traverseMod from '@babel/traverse';

const traverse = traverseMod.default ?? traverseMod;

export function parseJs(code, filename = 'snippet.js') {
  try {
    return parse(code, {
      sourceType: 'unambiguous',
      plugins: ['typescript'],
      sourceFilename: filename,
      errorRecovery: false,
    });
  } catch {
    return null;
  }
}

export function hasExportDefault(ast) {
  if (!ast) {
    return false;
  }
  let found = false;
  traverse(ast, {
    ExportDefaultDeclaration() {
      found = true;
    },
  });
  return found;
}

export function exportDefaultHasStringProp(ast, key, value) {
  if (!ast) {
    return false;
  }
  let found = false;
  traverse(ast, {
    ExportDefaultDeclaration(path) {
      path.traverse({
        ObjectProperty(propPath) {
          if (objectKeyName(propPath.node) === key && stringLiteralValue(propPath.node.value) === value) {
            found = true;
          }
        },
      });
    },
  });
  return found;
}

export function hasImportSourceContaining(ast, needle) {
  if (!ast) {
    return false;
  }
  let found = false;
  traverse(ast, {
    ImportDeclaration(path) {
      const source = path.node.source?.value ?? '';
      if (source.includes(needle)) {
        found = true;
      }
    },
    CallExpression(path) {
      if (path.node.callee.type !== 'Import') {
        return;
      }
      const first = path.node.arguments[0];
      const source = stringLiteralValue(first) ?? '';
      if (source.includes(needle)) {
        found = true;
      }
    },
  });
  return found;
}

function objectKeyName(node) {
  if (!node?.key) {
    return '';
  }
  if (node.key.type === 'Identifier') {
    return node.key.name;
  }
  if (node.key.type === 'StringLiteral') {
    return node.key.value;
  }
  return '';
}

function stringLiteralValue(node) {
  if (node?.type === 'StringLiteral') {
    return node.value;
  }
  return null;
}
