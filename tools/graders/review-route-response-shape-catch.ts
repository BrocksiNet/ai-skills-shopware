// Grader: review-route-response-shape-catch (sw-plugin-development, PLG-012)
// The new Store-API route answers with an ArrayStruct around an ad-hoc array
// and documents no fields, so clients get no stable shape. Needs a minor+
// finding in src/ that names PLG-012 or describes the untyped response.
import { reviewCatch } from '../src/grade/review.ts';

export const grade = reviewCatch({
  rule: 'PLG-012',
  file: 'src/**',
  minSeverity: 'minor',
  summary:
    /untyped|ad.?hoc|raw array|plain array|associative array|typed (struct|dto|response)|response shape|documented fields/iu,
});
