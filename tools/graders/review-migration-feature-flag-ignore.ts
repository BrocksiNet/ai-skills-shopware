// Grader: review-migration-feature-flag-ignore (sw-plugin-development, PLG-029)
// The migration adds the column unconditionally; only the tier resolver
// reads the flag. A minor+ finding that names PLG-029 or ties the flag to the
// migration or schema is a false positive.
import { reviewIgnore } from '../src/grade/review.ts';

export const grade = reviewIgnore({
  rule: 'PLG-029',
  summary:
    /(migration|schema|column)[^.]{0,80}(feature.?flag|Feature::|\bflag\b)|(feature.?flag|Feature::|\bflag\b)[^.]{0,80}(migration|schema|column)/iu,
});
