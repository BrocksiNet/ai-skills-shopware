// Grader: review-admin-global-stub-catch (sw-admin-js, ADM-036)
// The change registers the real sw-block in config.global.components while
// the same key stays in config.global.stubs. Vue Test Utils skips
// app.component() for keys that also appear in stubs, so specs keep the stub.
// Needs a major+ finding in the test setup that names ADM-036 or describes
// the skipped registration.
import { reviewCatch } from '../src/grade/review.ts';

export const grade = reviewCatch({
  rule: 'ADM-036',
  file: 'src/Resources/app/administration/test/_setup/prepare_environment.js',
  minSeverity: 'major',
  summary:
    /\bstubs?\b[^.]{0,80}\bcomponents?\b|\bcomponents?\b[^.]{0,80}\bstubs?\b|\bstubbed\b|\bskips?\b|\bskipped\b|\bskipping\b|app\.component|\bnever (registered|rendered)\b/iu,
});
