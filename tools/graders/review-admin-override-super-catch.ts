// Grader: review-admin-override-super-catch (shopware-admin-js, ADM-042)
// The plugin overrides sw-order-list to add a loyalty points column. Its
// orderCriteria calls this.$super, but getOrderColumns copies the core column
// list and appends one entry without calling this.$super, so columns from
// other plugins' overrides and later core changes are dropped. Needs a major+
// finding in the plugin sources that names ADM-042 or describes the copy.
import { reviewCatch } from '../src/grade/review.ts';

export const grade = reviewCatch({
  rule: 'ADM-042',
  file: 'src/**',
  minSeverity: 'major',
  summary:
    /(does ?n[o']?t|never|without|missing|no|instead of|skips?|bypass\w*)\W+(call(s|ing)?\W+)?(this\.)?\$?super\b|cop(y|ies|ied|ying)[^.]{0,60}(core|original|parent)|duplicat\w*[^.]{0,60}(core|original|parent)|replac\w* the (core|original|parent|whole)\b[^.]{0,40}(method|implementation|columns)|(other|later|third.party) (plugins?|extensions?|apps?|overrides?)\b[^.]{0,80}(skip|lost|lose|drop|bypass|ignor|overwrit|break|miss)|(skip|lose|drop|bypass|ignor|overwrit)\w*[^.]{0,60}(other|later|third.party) (plugins?|extensions?|apps?|overrides?)|(future|upstream|later) (core )?(\w+ )?(changes|fixes|updates|columns)/iu,
});
