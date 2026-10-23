// Grader: review-storefront-template-range-catch (shopware-plugin-development, PLG-001)
// SwagNavigationTeaser 1.4.0 allows shopware/core ~6.6.0 || ~6.7.0 and
// extends @Storefront/storefront/layout/navigation/flyout.html.twig to add a
// teaser image. Core removed that template in 6.7.0.0 (the navbar replaced
// it), so on every 6.7 release the teaser never renders. Needs a major+
// finding in the views that names PLG-001 or describes the template missing
// in 6.7. No skill names the template: the release comes from the source or
// api-facts.
import { reviewCatch } from '../src/grade/review.ts';

export const grade = reviewCatch({
  rule: 'PLG-001',
  file: 'src/Resources/views/**',
  minSeverity: 'major',
  summary:
    /(remov|no longer (exist|ship|render|load|regist)|(does not|doesn't|did not) exist|missing|gone|dropped|not registered)(?:[^.]|\.\S){0,80}6\.7|6\.7(?:[^.]|\.\S){0,80}(remov|no longer|(does not|doesn't) exist|missing|gone|drop|not registered|silently)/iu,
});
