// Grader: review-admin-privilege-shape-catch (shopware-admin-js, ADM-004)
// SwagLoyalty supports 6.6 and 6.7. The change adds a tiers module whose
// addPrivilegeMappingEntry passes a flat privileges object instead of roles
// with privileges and dependencies per role. isPrivilegeMapping checks only
// category, parent and key, so the entry registers and the role screens
// throw a TypeError. Needs a major+ finding in the Administration sources
// that names ADM-004 or describes the wrong shape.
import { reviewCatch } from '../src/grade/review.ts';

export const grade = reviewCatch({
  rule: 'ADM-004',
  file: 'src/Resources/app/administration/**',
  minSeverity: 'major',
  summary:
    /\broles\b|isPrivilegeMapping|TypeError|\bdependencies\b|\bflat\b|(mapping|privileges?)[^.]{0,40}(shape|structure|format)|(shape|structure|format)[^.]{0,40}(mapping|privileges?)|wrong (key|property)/iu,
});
