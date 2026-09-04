import { readFileSync } from 'node:fs';
import Engine from 'php-parser';
import { findFiles } from './files.mjs';

const engine = new Engine({
  parser: { extractDoc: true, php8: true },
  ast: { withPositions: false },
});

export function parsePhp(code, filename = 'snippet.php') {
  try {
    return engine.parseCode(code, filename);
  } catch {
    return null;
  }
}

export function walkPhp(node, visit, seen = new Set()) {
  if (node === null || typeof node !== 'object') {
    return;
  }
  if (seen.has(node)) {
    return;
  }
  seen.add(node);
  if (Array.isArray(node)) {
    for (const item of node) {
      walkPhp(item, visit, seen);
    }
    return;
  }
  if (typeof node.kind === 'string') {
    visit(node);
  }
  for (const value of Object.values(node)) {
    if (value !== null && typeof value === 'object') {
      walkPhp(value, visit, seen);
    }
  }
}

export function nodeName(node) {
  if (typeof node === 'string') {
    return node;
  }
  if (node && typeof node.name === 'string') {
    return node.name;
  }
  if (node && node.name && typeof node.name.name === 'string') {
    return node.name.name;
  }
  return '';
}

export function findClass(ast, className) {
  if (!ast) {
    return null;
  }
  let found = null;
  walkPhp(ast, (node) => {
    if (node.kind === 'class' && nodeName(node.name) === className) {
      found = node;
    }
  });
  return found;
}

export function classAttributes(classNode) {
  return flattenAttrGroups(classNode?.attrGroups);
}

export function findMethod(classNode, methodName) {
  if (!classNode || !Array.isArray(classNode.body)) {
    return null;
  }
  return classNode.body.find((node) => node.kind === 'method' && nodeName(node.name) === methodName) ?? null;
}

export function methodAttributes(methodNode) {
  return flattenAttrGroups(methodNode?.attrGroups);
}

export function attributeBasename(attr) {
  const name = nodeName(attr?.name) || (typeof attr?.name === 'string' ? attr.name : '');
  const parts = name.split('\\');
  return parts[parts.length - 1] ?? '';
}

export function attributeClassRefNames(attr) {
  const names = [];
  for (const arg of attr?.args ?? []) {
    if (arg.kind === 'staticlookup' && nodeName(arg.offset) === 'class') {
      names.push(nodeName(arg.what));
    }
  }
  return names;
}

export function attributeNamedStringArgs(attr) {
  const out = {};
  for (const arg of attr?.args ?? []) {
    if (arg.kind === 'namedargument' && arg.value?.kind === 'string') {
      out[nodeName(arg.name) || arg.name] = arg.value.value;
    }
  }
  return out;
}

export function hasUseImport(ast, fqn) {
  if (!ast) {
    return false;
  }
  let found = false;
  walkPhp(ast, (node) => {
    if (node.kind === 'useitem' && node.name === fqn) {
      found = true;
    }
  });
  return found;
}

export function methodParamTypeNames(methodNode, paramName) {
  const param = (methodNode?.arguments ?? []).find((arg) => nodeName(arg.name) === paramName);
  if (!param?.type) {
    return [];
  }
  if (param.type.kind === 'uniontype') {
    return (param.type.types ?? []).map((type) => nodeName(type) || type.name).filter(Boolean);
  }
  const single = nodeName(param.type) || param.type.name;
  return single ? [single] : [];
}

export function collectCommentValues(ast) {
  const values = [];
  walkPhp(ast, (node) => {
    if (node.kind === 'commentblock' || node.kind === 'commentline') {
      values.push(node.value ?? '');
    }
  });
  return values;
}

export function sourceHasDeprecatedReason(source) {
  return /@deprecated\s+reason:/m.test(source);
}

export function findPhpClassFile(workdir, className) {
  const files = findFiles(workdir, (path) => path.endsWith('.php'));
  for (const path of files) {
    let source;
    try {
      source = readFileSync(path, 'utf8');
    } catch {
      continue;
    }
    const ast = parsePhp(source, path);
    if (ast && findClass(ast, className)) {
      return { path, ast, source };
    }
  }
  return null;
}

function flattenAttrGroups(groups) {
  const attrs = [];
  for (const group of groups ?? []) {
    for (const attr of group.attrs ?? []) {
      attrs.push(attr);
    }
  }
  return attrs;
}
