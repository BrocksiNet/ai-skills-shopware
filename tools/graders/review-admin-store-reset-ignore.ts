// Grader: review-admin-store-reset-ignore (sw-admin-js, ADM-045)
// The change calls the store's $reset() once when the page is created and
// reads campaign through the store computed. That is the store's own reset,
// with no local copy. A major+ finding that names ADM-045 or calls the reset
// wrong is a false positive.
import { reviewIgnore } from '../src/grade/review.ts';

export const grade = reviewIgnore({
  rule: 'ADM-045',
  summary: /\$reset|\breset\b|one (by )?one|by hand|local copy|copy of (the )?store|stale/iu,
});
