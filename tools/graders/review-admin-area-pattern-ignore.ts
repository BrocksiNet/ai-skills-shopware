// Grader: review-admin-area-pattern-ignore (sw-admin-js, ADM-006)
// The module already renders a Vue SFC (the tier hint), so a second SFC added
// the same way follows the area's pattern. A minor+ finding that names ADM-006
// or calls the SFC a break is a false positive.
import { reviewIgnore } from '../src/grade/review.ts';

export const grade = reviewIgnore({
  rule: 'ADM-006',
  summary: /\.vue\b|single[- ]file|\bSFC\b|component factory|Component\.register|\bTwig\b|\bblocks\b/iu,
});
