// Grader: review-opt-in-backfill-ignore (sw-change-impact, IMP-005)
// The points are computed from the order lines the finish page already has:
// no setting, no command, no extra query. A minor+ finding that names IMP-005
// or calls the points an extra step is a false positive.
import { reviewIgnore } from '../src/grade/review.ts';

export const grade = reviewIgnore({
  rule: 'IMP-005',
  summary:
    /(new|extra|additional|another) (config|setting|option|header|flag|command|step|ritual)|merchant[^.]{0,80}(must|has to|needs to|have to) (enable|turn on|run|set|configure)|backfill|(extra|manual|another) step|easier|(removes?|drops?|skips?) (a|the|this|one) step|(setting|config|flag)[^.]{0,60}(off by default|default (off|false))|compute[^.]{0,80}(at read|on read|on render|from the (loaded )?(order|lines?))/iu,
});
