// Grader: review-admin-webpack-config-catch (sw-admin-js, ADM-009)
// SwagLoyalty requires shopware/core ~6.7.0. The change adds
// build/webpack.config.js with an @loyalty alias and a component importing
// from it. 6.7 builds the Administration with Vite and does not read the
// webpack config, so the alias does nothing and the import fails. Needs a
// major+ finding in the Administration sources that names ADM-009 or
// describes the ignored config.
import { reviewCatch } from '../src/grade/review.ts';

export const grade = reviewCatch({
  rule: 'ADM-009',
  file: 'src/Resources/app/administration/**',
  minSeverity: 'major',
  summary: /\bvite\b|webpack[^.]{0,60}(ignored|not (used|read|loaded|picked up)|no (effect|longer))|\b6\.7\b/iu,
});
