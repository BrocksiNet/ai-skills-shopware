// Grader: review-codecoverage-ignore-see-catch (sw-testing, TEST-033)
// The diff marks CartNormalizer @codeCoverageIgnore and imports its integration
// test only so the @see can name it by short name. Needs a minor+ finding that
// cites TEST-033 on the production file, or one without an ID there that
// describes the import or the missing leading-backslash FQCN.
import { reviewCatch } from '../src/grade/review.ts';

export const grade = reviewCatch({
  rule: 'TEST-033',
  file: 'src/**',
  minSeverity: 'minor',
  summary:
    /leading.backslash|fully.qualified|\bFQCN\b|\buse\b.{0,60}(import|statement|annotation|docblock)|(import|\buse\b).{0,60}@see|@see.{0,60}(import|short)|short (class )?name/iu,
});
