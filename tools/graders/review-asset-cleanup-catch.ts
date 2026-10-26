// Grader: review-asset-cleanup-catch (sw-core-development, CORE-077)
// ThemeCompiler::compile() deletes the previous theme directory in the same
// step that switches the hash. Pages cached before the switch still request
// the old URLs, so the delete belongs in a scheduled task or message handler.
// Needs a major+ finding in src/Storefront/ that names CORE-077 or describes the
// synchronous delete. Another catalog ID does not count: the timing is the point.
import { reviewCatch } from '../src/grade/review.ts';

export const grade = reviewCatch({
  rule: 'CORE-077',
  file: 'src/Storefront/**',
  minSeverity: 'major',
  summary:
    /synchron|right after|immediately after|same (request|command|compile|deploy)|in the (command|request|compile|deploy) (step|path)/iu,
});
