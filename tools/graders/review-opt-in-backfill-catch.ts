// Grader: review-opt-in-backfill-catch (sw-change-impact, IMP-005)
// The points only show after a merchant turns on a new setting and runs a
// backfill command by hand. Computing them from the order lines the finish
// page already loads needs neither. A major+ finding in src/ that names
// IMP-005 or calls the setting and backfill a step the shop has to take.
import { reviewCatch } from '../src/grade/review.ts';

export const grade = reviewCatch({
  rule: 'IMP-005',
  file: 'src/**',
  minSeverity: 'major',
  summary:
    /(new|extra|additional|another) (config|setting|option|header|flag|command|step|ritual)|merchant[^.]{0,80}(must|has to|needs to|have to) (enable|turn on|run|set|configure)|backfill|(extra|manual|another) step|easier|(removes?|drops?|skips?) (a|the|this|one) step|(setting|config|flag)[^.]{0,60}(off by default|default (off|false))|compute[^.]{0,80}(at read|on read|on render|from the (loaded )?(order|lines?))/iu,
});
