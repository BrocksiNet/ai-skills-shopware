// Grader: review-js-plugin-range-catch (shopware-plugin-development, PLG-001)
// SwagHoverIntent 2.1.0 allows shopware/core ~6.6.0 || ~6.7.0 and overrides
// the FlyoutMenu storefront plugin, extending its class from
// src/plugin/main-menu/flyout-menu.plugin. Core removed FlyoutMenu in
// 6.7.0.0, so on 6.7 the import fails and the override has nothing to
// replace. Needs a major+ finding in the storefront sources that names
// PLG-001 or describes the plugin missing in 6.7. No skill names FlyoutMenu.
import { reviewCatch } from '../src/grade/review.ts';

export const grade = reviewCatch({
  rule: 'PLG-001',
  file: 'src/Resources/app/storefront/src/**',
  minSeverity: 'major',
  summary:
    /(remov|no longer (exist|ship|render|load|regist)|(does not|doesn't|did not) exist|missing|gone|dropped|not registered)(?:[^.]|\.\S){0,80}6\.7|6\.7(?:[^.]|\.\S){0,80}(remov|no longer|(does not|doesn't) exist|missing|gone|drop|not registered|silently)/iu,
});
