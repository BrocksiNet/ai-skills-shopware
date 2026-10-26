// Grader: review-admin-flag-old-branch-ignore (sw-admin-js, ADM-025)
// The flag branch uses the new rounding and the flag-off branch keeps
// Math.floor, so nothing changes without the flag. A minor+ finding that names
// ADM-025 or calls the flag-off path changed is a false positive.
import { reviewIgnore } from '../src/grade/review.ts';

export const grade = reviewIgnore({
  rule: 'ADM-025',
  summary:
    /legacy|\bold (branch|behaviou?r|path|code)\b|\belse (branch|path)\b|flag[- ]?(off|disabled)|(flag|feature) (is )?(off|disabled)|keep the old/iu,
});
