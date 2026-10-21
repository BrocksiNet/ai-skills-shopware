// Grader: review-admin-position-identifier-ignore (shopware-admin-js, ADM-040)
// The change adds a new swag-loyalty-detail-history position identifier and
// its blocks-list.json entry, and keeps swag-loyalty-detail-sidebar. A minor+
// finding that names ADM-040 or calls it a breaking change is a false positive.
import { reviewIgnore } from '../src/grade/review.ts';

export const grade = reviewIgnore({
  rule: 'ADM-040',
  summary:
    /renam|remov|no longer (exist|render)|deprecat|position.?identifier[^.]{0,80}(chang|break)|(apps?|plugins?|extensions?)\b[^.]{0,80}(break|fail|stop|lose|disappear|no longer)|backward.?compat|\bBC\b|breaking/iu,
});
