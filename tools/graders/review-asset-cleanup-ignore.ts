// Grader: review-asset-cleanup-ignore (sw-core-development, CORE-077)
// The same compile step retires the old hash, and a message handler deletes
// its directory after a seven-day grace period. Nothing runs in the switch
// path, so a minor+ finding that names CORE-077 or calls the delete synchronous
// is a false positive.
import { reviewIgnore } from '../src/grade/review.ts';

export const grade = reviewIgnore({
  rule: 'CORE-077',
  summary: /synchron|right after|immediately after|in the (command|request|compile|deploy) (step|path)/iu,
});
