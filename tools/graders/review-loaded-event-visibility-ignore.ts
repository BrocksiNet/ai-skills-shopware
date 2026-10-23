// Grader: review-loaded-event-visibility-ignore (sw-review-learnings, REV-035)
// The probe loads the candidates with search() and checks getActive() on the
// loaded categories, the check the storefront applies. A minor+ finding that
// names REV-035 or claims a restriction is missed is a false positive.
import { reviewIgnore } from '../src/grade/review.ts';

export const grade = reviewIgnore({
  rule: 'REV-035',
  summary: /(\.loaded|loaded(-| )event|dynamic access|restrict|getActive|setActive|searchIds|active (flag|state) (set|changed) (by|on) (load|subscriber))/iu,
});
