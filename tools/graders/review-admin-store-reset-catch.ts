// Grader: review-admin-store-reset-catch (sw-admin-js, ADM-045)
// The change clears four store fields by hand in created() and keeps a copy
// of the store's campaign in data(). The store has $reset(), and the copy
// goes stale when the store changes. Needs a major+ finding in the
// Administration sources that names ADM-045 or describes the hand reset or
// the stale copy.
import { reviewCatch } from '../src/grade/review.ts';

export const grade = reviewCatch({
  rule: 'ADM-045',
  file: 'src/Resources/app/administration/**',
  minSeverity: 'major',
  summary: /\$reset|\breset\b|one (by )?one|by hand|local copy|copy of (the )?store|stale/iu,
});
