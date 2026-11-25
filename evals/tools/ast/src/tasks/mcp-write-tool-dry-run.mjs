import { findClass, findMethod, findPhpClassFile, nodeName, walkPhp } from '../php.mjs';

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
  const cls = findClass(ast, 'AdjustPointsTool');
  if (!cls) {
    return { score: 0, detail: 'AdjustPointsTool not found' };
  }

  const extendsResponse = lastSegment(nodeName(cls.extends)) === 'McpToolResponse';
  const invoke = findMethod(cls, '__invoke');
  const returnsResult = returnTypeBasename(invoke) === 'McpToolResult';

  const dryRunParam = (invoke?.arguments ?? []).find((arg) => nodeName(arg.name) === 'dryRun');
  const dryRunBool = Boolean(dryRunParam && !dryRunParam.nullable && nodeName(dryRunParam.type).toLowerCase() === 'bool');
  const dryRunDefaultTrue = Boolean(
    dryRunParam?.value?.kind === 'boolean' && dryRunParam.value.value === true,
  );

  let usesExecuteWithDryRunResult = false;
  let usesLegacyExecuteWithDryRun = false;

  walkPhp(cls, (node) => {
    if (node.kind !== 'call') {
      return;
    }
    const what = node.what;
    if (what?.kind === 'propertylookup' && what.what?.kind === 'variable' && what.what.name === 'this') {
      const name = nodeName(what.offset);
      if (name === 'executeWithDryRunResult') usesExecuteWithDryRunResult = true;
      if (name === 'executeWithDryRun') usesLegacyExecuteWithDryRun = true;
    }
  });

  const pass =
    extendsResponse &&
    returnsResult &&
    dryRunBool &&
    dryRunDefaultTrue &&
    usesExecuteWithDryRunResult &&
    !usesLegacyExecuteWithDryRun;

  return {
    score: pass ? 1 : 0,
    detail: [
      `extends=${Number(extendsResponse)}`,
      `return=${Number(returnsResult)}`,
      `dry_run_bool=${Number(dryRunBool)}`,
      `default_true=${Number(dryRunDefaultTrue)}`,
      `helper=${Number(usesExecuteWithDryRunResult)}`,
      `legacy=${Number(usesLegacyExecuteWithDryRun)}`,
    ].join(' '),
  };
}

export function grade({ workdir }) {
  const found = findPhpClassFile(workdir, 'AdjustPointsTool');
  if (!found) {
    return { score: 0, detail: 'AdjustPointsTool.php not found' };
  }
  if (!found.ast) {
    return { score: 0, detail: 'parse_error' };
  }
  return evaluate(found.ast);
}
