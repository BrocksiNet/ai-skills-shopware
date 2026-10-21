// Grader: review-admin-privilege-shape-ignore (shopware-admin-js, ADM-004)
// The same tiers module registers roles with privileges and dependencies per
// role (editor depends on the viewer), which is the shape the role screens
// read. A minor+ finding that names ADM-004 or calls the mapping malformed
// is a false positive.
import { reviewIgnore } from '../src/grade/review.ts';

export const grade = reviewIgnore({
  rule: 'ADM-004',
  summary:
    /\broles\b|isPrivilegeMapping|TypeError|\bdependencies\b|\bflat\b|(mapping|privileges?)[^.]{0,40}(shape|structure|format)|(shape|structure|format)[^.]{0,40}(mapping|privileges?)|wrong (key|property)/iu,
});
