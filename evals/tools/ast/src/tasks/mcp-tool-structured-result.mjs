import {
  attributeBasename,
  classAttributes,
  findClass,
  findMethod,
  findPhpClassFile,
  nodeName,
  walkPhp,
} from '../php.mjs';

const LEGACY_METHODS = new Set([
  'success',
  'error',
  'requirePrivilege',
  'missingPrivilegesError',
  'invalidCriteriaError',
  'decodeJsonOrError',
  'executeWithDryRun',
]);

function lastSegment(name) {
  const parts = String(name || '').split('\\');
  return parts[parts.length - 1] ?? '';
}

function returnTypeBasename(methodNode) {
  if (!methodNode?.type || methodNode.nullable) {
    return '';
  }
  if (methodNode.type.kind === 'uniontype' || methodNode.type.kind === 'intersectiontype') {
    return '';
  }
  return lastSegment(nodeName(methodNode.type));
}

export function evaluate(ast) {
  const cls = findClass(ast, 'PointsLookupTool');
  if (!cls) {
    return { score: 0, detail: 'PointsLookupTool not found' };
  }

  const hasToolAttr = classAttributes(cls).some((attr) => attributeBasename(attr) === 'McpTool');
  const extendsResponse = lastSegment(nodeName(cls.extends)) === 'McpToolResponse';
  const invoke = findMethod(cls, '__invoke');
  const returnsResult = returnTypeBasename(invoke) === 'McpToolResult';

  let callsSuccessResult = false;
  let callsErrorResult = false;
  let callsLegacyHelper = false;
  let callsJsonEncode = false;

  if (invoke) {
    walkPhp(invoke, (node) => {
      if (node.kind !== 'call') {
        return;
      }
      const what = node.what;
      if (what?.kind === 'propertylookup' && what.what?.kind === 'variable' && what.what.name === 'this') {
        const name = nodeName(what.offset);
        if (name === 'successResult') callsSuccessResult = true;
        if (name === 'errorResult') callsErrorResult = true;
        if (LEGACY_METHODS.has(name)) callsLegacyHelper = true;
      } else if (what?.kind === 'staticlookup' && lastSegment(nodeName(what.what)) === 'McpToolResult') {
        const name = nodeName(what.offset);
        if (name === 'success' || name === 'text') callsSuccessResult = true;
        if (name === 'failure') callsErrorResult = true;
      } else if (what?.kind === 'name' && nodeName(what).replace(/^\\/, '') === 'json_encode') {
        callsJsonEncode = true;
      }
    });
  }

  const pass =
    hasToolAttr &&
    extendsResponse &&
    returnsResult &&
    callsSuccessResult &&
    callsErrorResult &&
    !callsLegacyHelper &&
    !callsJsonEncode;

  return {
    score: pass ? 1 : 0,
    detail: [
      `attr=${Number(hasToolAttr)}`,
      `extends=${Number(extendsResponse)}`,
      `return=${Number(returnsResult)}`,
      `success_result=${Number(callsSuccessResult)}`,
      `error_result=${Number(callsErrorResult)}`,
      `legacy=${Number(callsLegacyHelper)}`,
      `json_encode=${Number(callsJsonEncode)}`,
    ].join(' '),
  };
}

export function grade({ workdir }) {
  const found = findPhpClassFile(workdir, 'PointsLookupTool');
  if (!found) {
    return { score: 0, detail: 'PointsLookupTool.php not found' };
  }
  if (!found.ast) {
    return { score: 0, detail: 'parse_error' };
  }
  return evaluate(found.ast);
}
