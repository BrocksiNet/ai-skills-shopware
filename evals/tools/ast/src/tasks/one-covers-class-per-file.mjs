import {
  attributeBasename,
  attributeClassRefNames,
  classAttributes,
  findClass,
  findClasses,
  findPhpClassFile,
} from '../php.mjs';

export function evaluate(ast) {
  const cls = findClass(ast, 'CartNormalizerTest');
  if (!cls) {
    return flags(0, { covers_normalizer: 0, covers_helper: 0, covers_count: 0 }, 'CartNormalizerTest not found');
  }

  const testCovers = classAttributes(cls).filter((attr) => attributeBasename(attr) === 'CoversClass');
  const testRefs = testCovers.flatMap((attr) => attributeClassRefNames(attr));
  const coversNormalizer = testRefs.includes('CartNormalizer') ? 1 : 0;

  const fileCovers = findClasses(ast).flatMap((classNode) =>
    classAttributes(classNode).filter((attr) => attributeBasename(attr) === 'CoversClass'),
  );
  const fileRefs = fileCovers.flatMap((attr) => attributeClassRefNames(attr));
  const coversHelper = fileRefs.includes('LineItemHelper') ? 1 : 0;
  const coversCount = fileCovers.length;
  const score = coversNormalizer === 1 && coversHelper === 0 && coversCount === 1 ? 1 : 0;

  return flags(score, {
    covers_normalizer: coversNormalizer,
    covers_helper: coversHelper,
    covers_count: coversCount,
  });
}

export function grade({ workdir }) {
  const found = findPhpClassFile(workdir, 'CartNormalizerTest');
  if (!found) {
    return { score: 0, detail: 'CartNormalizerTest.php not found' };
  }
  if (!found.ast) {
    return { score: 0, detail: 'parse_error' };
  }
  return evaluate(found.ast);
}

function flags(score, parts, extra) {
  const detail = Object.entries(parts)
    .map(([key, value]) => `${key}=${value}`)
    .join(' ');
  return { score, detail: extra ? `${extra} ${detail}` : detail };
}
