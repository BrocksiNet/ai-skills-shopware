import {
  attributeBasename,
  attributeClassRefNames,
  classAttributes,
  findClass,
  findPhpClassFile,
} from '../php.mjs';

export function evaluate(ast) {
  const cls = findClass(ast, 'CartNormalizerTest');
  if (!cls) {
    return flags(0, { covers_normalizer: 0, covers_helper: 0, covers_count: 0 }, 'CartNormalizerTest not found');
  }

  const covers = classAttributes(cls).filter((attr) => attributeBasename(attr) === 'CoversClass');
  const refs = covers.flatMap((attr) => attributeClassRefNames(attr));
  const coversNormalizer = refs.includes('CartNormalizer') ? 1 : 0;
  const coversHelper = refs.includes('LineItemHelper') ? 1 : 0;
  const coversCount = covers.length;
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
