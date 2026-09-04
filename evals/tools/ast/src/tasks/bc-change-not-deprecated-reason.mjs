import {
  attributeBasename,
  attributeNamedStringArgs,
  findClass,
  findMethod,
  findPhpClassFile,
  hasUseImport,
  methodAttributes,
  methodParamTypeNames,
  sourceHasDeprecatedReason,
} from '../php.mjs';

const IMPORT = 'Shopware\\Core\\Framework\\Deprecation\\BCChange\\ParameterTypeNarrowing';

export function evaluate(ast, source = '') {
  const cls = findClass(ast, 'LegacyIdLoader');
  const load = cls ? findMethod(cls, 'load') : null;
  const narrowing = (load ? methodAttributes(load) : []).find(
    (attr) => attributeBasename(attr) === 'ParameterTypeNarrowing',
  );
  const args = narrowing ? attributeNamedStringArgs(narrowing) : {};
  const hasAttr =
    args.version === 'v6.8.0' && args.parameterName === 'id' && args.newType === 'string' ? 1 : 0;
  const hasImport = hasUseImport(ast, IMPORT) ? 1 : 0;
  const hasReason = sourceHasDeprecatedReason(source) ? 1 : 0;
  const types = load ? methodParamTypeNames(load, 'id') : [];
  const keepsUnion = types.includes('string') && types.includes('int') ? 1 : 0;
  const score = hasAttr === 1 && hasImport === 1 && hasReason === 0 && keepsUnion === 1 ? 1 : 0;

  return {
    score,
    detail: `attr=${hasAttr} import=${hasImport} reason=${hasReason} union=${keepsUnion}`,
  };
}

export function grade({ workdir }) {
  const found = findPhpClassFile(workdir, 'LegacyIdLoader');
  if (!found) {
    return { score: 0, detail: 'LegacyIdLoader.php not found' };
  }
  if (!found.ast) {
    return { score: 0, detail: 'parse_error' };
  }
  return evaluate(found.ast, found.source);
}
