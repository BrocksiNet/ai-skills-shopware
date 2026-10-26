// Grader: review-admin-flag-old-branch-catch (sw-admin-js, ADM-025)
// The flag-off branch of pointsFor goes through roundPoints(…, 'down'), and
// that helper truncates toward zero, so refunds (negative amounts) earn other
// points with the flag off. Needs a major+ finding in the Administration
// sources that names ADM-025 or describes the changed flag-off path.
import { reviewCatch } from '../src/grade/review.ts';

export const grade = reviewCatch({
  rule: 'ADM-025',
  file: 'src/Resources/app/administration/**',
  minSeverity: 'major',
  summary:
    /legacy|\bold (branch|behaviou?r|path|code)\b|\belse (branch|path)\b|flag[- ]?(off|disabled)|(flag|feature) (is )?(off|disabled)|keep the old/iu,
});
