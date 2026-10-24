// Grader: review-deprecation-tag-replacement-ignore (sw-core-development, CORE-017)
// The same deprecation as the catch task, but its @deprecated tag names the
// replacement. A finding above nit that names CORE-017 or says the tag lacks
// the replacement is a false positive.
import { reviewIgnore } from '../src/grade/review.ts';

export const grade = reviewIgnore({
  rule: 'CORE-017',
  summary:
    /(@deprecated|deprecation tag|the tag)[^.]{0,80}(replacement|instead|no replacement)|replacement[^.]{0,60}(not named|unnamed|missing|absent|not stated|not in the tag)|no replacement|does not name/iu,
});
