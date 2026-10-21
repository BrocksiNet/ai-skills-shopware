// Grader: admin-jest-colocated-spec
import { existsSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { filesUnder, type Grader, hasLine, read, stripComments, verdict } from '../src/grade/kit.ts';

export const grade: Grader = ({ workdir }) => {
  const files = filesUnder(workdir);
  const hasSource = files.some((f) => basename(f) === 'product-card.ts');
  const spec = files.find((f) => f.endsWith('/product-card.spec.ts'));
  let colocated = false;
  let oversized = false;
  let hasCase = false;
  let hasAssert = false;
  let usesSubject = false;
  if (spec !== undefined) {
    colocated = existsSync(join(dirname(spec), 'product-card.ts'));
    const text = read(spec);
    oversized = (text.match(/\n/gu)?.length ?? 0) >= 500;
    const code = stripComments(text);
    hasCase = hasLine(code, /\b(describe|it|test)\s*\(/u);
    // Import the component and assert on it (not a tautology / comment token).
    if (
      hasLine(code, /import\s+ProductCard\s+from\s+['"]\.\/product-card['"]/u) &&
      hasLine(code, /expect\s*\(\s*ProductCard/u)
    ) {
      hasAssert = true;
      usesSubject = true;
    }
  }
  const testsDir = files.some((f) => f.includes('/tests/') && f.endsWith('.spec.ts'));
  return verdict(hasSource && colocated && !testsDir && !oversized && hasCase && hasAssert && usesSubject, {
    source: hasSource,
    colocated,
    tests_dir: testsDir,
    oversized,
    case: hasCase,
    assert: hasAssert,
    subject: usesSubject,
  });
};
