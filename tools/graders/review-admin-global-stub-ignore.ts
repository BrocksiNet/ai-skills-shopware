// Grader: review-admin-global-stub-ignore (sw-admin-js, ADM-036)
// The change registers the real sw-block through config.global.stubs, which
// is the compliant form. It looks like the catch diff but names no conflict.
// A minor+ finding that names ADM-036 or calls the stub registration broken
// is a false positive.
import { reviewIgnore } from '../src/grade/review.ts';

export const grade = reviewIgnore({
  rule: 'ADM-036',
  summary:
    /\bstubs?\b[^.]{0,80}\bcomponents?\b|\bcomponents?\b[^.]{0,80}\bstubs?\b|\bstubbed\b|\bskips?\b|\bskipped\b|\bskipping\b|app\.component|\bnever (registered|rendered)\b/iu,
});
