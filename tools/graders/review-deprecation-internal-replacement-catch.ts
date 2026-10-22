// Grader: review-deprecation-internal-replacement-catch (sw-core-development, CORE-063)
// ProductPriceCalculator::calculate() is deprecated with a runtime warning,
// but its replacement ProductPriceCalculatorV2 is marked @internal, so
// extensions get a warning they cannot act on. Needs a major+ finding in
// src/Core/ that names CORE-063 or describes the unusable replacement.
import { reviewCatch } from '../src/grade/review.ts';

export const grade = reviewCatch({
  rule: 'CORE-063',
  file: 'src/Core/**',
  minSeverity: 'major',
  summary:
    /@internal|internal|experimental|not (yet )?(usable|available|public)|cannot (use|act|migrate)|can.t (use|act|migrate)|no (usable|public) replacement|replacement[^.]{0,60}(internal|not public|unusable)|silent/iu,
});
