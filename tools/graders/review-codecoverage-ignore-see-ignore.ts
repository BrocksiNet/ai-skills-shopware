// Grader: review-codecoverage-ignore-see-ignore (sw-testing, TEST-033)
// The same class and test, but @see names the test by its leading-backslash
// FQCN and no import is added. A minor+ finding that cites TEST-033 or objects
// to the FQCN or the import is a false positive.
import { reviewIgnore } from '../src/grade/review.ts';

export const grade = reviewIgnore({
  rule: 'TEST-033',
  summary:
    /leading.backslash|fully.qualified|\bFQCN\b|\buse\b.{0,60}(import|statement|annotation|docblock)|(import|\buse\b).{0,60}@see|@see.{0,60}(import|short)|short (class )?name/iu,
});
