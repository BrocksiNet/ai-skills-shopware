// Grader: review-store-api-contract-catch (sw-plugin-development, PLG-027)
// The released /store-api/loyalty/balance route changes `points` from a
// non-null integer to a nullable number. Needs a major+ finding in src/ that
// names PLG-027 or describes the breaking type or nullability change.
import { reviewCatch } from '../src/grade/review.ts';

export const grade = reviewCatch({
  rule: 'PLG-027',
  file: 'src/**',
  minSeverity: 'major',
  summary:
    /nullab|type change|changes? (the |its )?(response |field )?type|from int\w* to|breaking|backward.?compat|\bBC\b|existing clients/iu,
});
