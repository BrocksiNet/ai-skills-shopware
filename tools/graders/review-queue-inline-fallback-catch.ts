// Grader: review-queue-inline-fallback-catch (sw-review-learnings, REV-033)
// When dispatching the export message fails, the subscriber runs the
// 2 to 10 second ERP export inline during checkout. Needs a major+ finding
// in src/ that names REV-033 or describes the synchronous fallback.
import { reviewCatch } from '../src/grade/review.ts';

export const grade = reviewCatch({
  rule: 'REV-033',
  file: 'src/**',
  minSeverity: 'major',
  summary:
    /inline|synchronous|fallback|in the (checkout |storefront )?request|blocks? (the )?(checkout|request|customer)|request thread/iu,
});
