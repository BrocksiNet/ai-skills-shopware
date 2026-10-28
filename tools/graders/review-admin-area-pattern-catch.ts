// Grader: review-admin-area-pattern-catch (sw-admin-js, ADM-006)
// The settings module builds its components with Component.register and
// Twig blocks. The change adds a Vue SFC to it, which has no block for other
// extensions to extend and gives the module a second way to build a component.
// Needs a minor+ finding that names ADM-006 or describes the mismatch in the
// Administration sources.
import { reviewCatch } from '../src/grade/review.ts';

export const grade = reviewCatch({
  rule: 'ADM-006',
  file: 'src/Resources/app/administration/**',
  minSeverity: 'minor',
  summary: /\.vue\b|single[- ]file|\bSFC\b|component factory|Component\.register|\bTwig\b|\bblocks\b/iu,
});
