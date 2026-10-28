// Grader: review-thin-controller-catch (sw-plugin-development, PLG-006)
// SwagLoyalty adds GET /store-api/loyalty/balance. The controller injects the
// transaction repository, builds the Criteria with the expiry filter and the
// sum aggregation, and works out the tier itself. The route still works, so
// the review scale makes this minor ("correct, but costly or fragile"). Needs
// a minor+ finding in the plugin sources that names PLG-006 or says the work
// belongs in a service.
import { reviewCatch } from '../src/grade/review.ts';

export const SUMMARY =
  /controller.*(repositor|criteria|aggregat|business|logic|tier|DAL)|thin controller|(move|extract)\w* .*(to|into) a\b.*service|delegat/iu;

export const grade = reviewCatch({
  rule: 'PLG-006',
  file: 'src/**',
  minSeverity: 'minor',
  summary: SUMMARY,
});
