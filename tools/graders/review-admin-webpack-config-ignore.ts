// Grader: review-admin-webpack-config-ignore (shopware-admin-js, ADM-009)
// The same alias and import, but SwagLoyalty requires ~6.6.0, where the
// Administration still builds with webpack and reads build/webpack.config.js.
// A minor+ finding that names ADM-009 or calls the webpack config ignored is
// a false positive; other remarks (such as TypeScript) are not.
import { reviewIgnore } from '../src/grade/review.ts';

export const grade = reviewIgnore({
  rule: 'ADM-009',
  summary: /\bvite\b|webpack[^.]{0,60}(ignored|not (used|read|loaded|picked up)|no (effect|longer))|\b6\.7\b/iu,
});
