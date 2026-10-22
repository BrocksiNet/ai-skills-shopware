// Grader: review-supported-range-catch (shopware-plugin-development, PLG-001)
// SwagPaymentSync 2.4.1 keeps shopware/core ~6.6.0 || ~6.7.0 and swaps the
// deprecated OrderTransactionStateHandler::payPartially() for paidPartially().
// paidPartially() only exists from 6.7.0.0, so every 6.6 shop fails with an
// undefined method on a partial capture. Needs a major+ finding in the plugin
// sources that names PLG-001 or describes the missing method on 6.6.
import { reviewCatch } from '../src/grade/review.ts';

export const grade = reviewCatch({
  rule: 'PLG-001',
  file: 'src/**',
  minSeverity: 'major',
  summary:
    /undefined method|(does not|doesn't|did not) exist|not (available|present) (on|in|before)|missing (on|in|from)|(added|introduced|arrived) (only )?in 6\.7|only (exists )?(from|since|in|on) 6\.7|breaks? .{0,40}6\.6/iu,
});
