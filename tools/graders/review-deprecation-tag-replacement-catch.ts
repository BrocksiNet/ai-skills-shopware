// Grader: review-deprecation-tag-replacement-catch (sw-core-development, CORE-017)
// ProductPriceCalculator::calculate() gets a @deprecated tag that only says
// it will be removed. The runtime message names the replacement; the tag does
// not. Needs a minor+ finding in ProductPriceCalculator.php that names CORE-017
// or says the tag lacks the replacement.
import { reviewCatch } from '../src/grade/review.ts';

export const grade = reviewCatch({
  rule: 'CORE-017',
  file: 'src/Core/Content/Product/SalesChannel/Price/ProductPriceCalculator.php',
  minSeverity: 'minor',
  summary:
    /(@deprecated|deprecation tag|the tag)[^.]{0,80}(replacement|instead|no replacement)|replacement[^.]{0,60}(not named|unnamed|missing|absent|not stated|not in the tag)|no replacement|does not name/iu,
});
