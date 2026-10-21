// Grader: review-admin-override-super-ignore (shopware-admin-js, ADM-042)
// The override of sw-order-list starts from this.$super for orderCriteria
// and getOrderColumns and only inserts the loyalty points column. A minor+
// finding that names ADM-042 or says the override drops core or other
// plugins' columns is a false positive.
import { reviewIgnore } from '../src/grade/review.ts';

export const grade = reviewIgnore({
  rule: 'ADM-042',
  summary:
    /(does ?n[o']?t|never|without|missing|no|instead of|skips?|bypass\w*)\W+(call(s|ing)?\W+)?(this\.)?\$?super\b|cop(y|ies|ied|ying)[^.]{0,60}(core|original|parent)|duplicat\w*[^.]{0,60}(core|original|parent)|replac\w* the (core|original|parent|whole)\b[^.]{0,40}(method|implementation|columns)|(other|later|third.party) (plugins?|extensions?|apps?|overrides?)\b[^.]{0,80}(skip|lost|lose|drop|bypass|ignor|overwrit|break|miss)|(skip|lose|drop|bypass|ignor|overwrit)\w*[^.]{0,60}(other|later|third.party) (plugins?|extensions?|apps?|overrides?)|(future|upstream|later) (core )?(\w+ )?(changes|fixes|updates|columns)/iu,
});
