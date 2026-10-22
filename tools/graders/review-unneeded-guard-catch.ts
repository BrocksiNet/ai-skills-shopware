// Grader: review-unneeded-guard-catch (shopware-review-learnings, REV-015)
// SwagMediaCdn supports ~6.6.0 || ~6.7.0 and registers a subscriber for
// UpdateMediaPathEvent behind class_exists(). The event exists in every
// release since 6.5.7.0, so the guard is always true. Needs a minor+ finding
// in the plugin sources that names REV-015 or describes the dead guard. No
// skill names UpdateMediaPathEvent, and no comment hints at a version.
import { reviewCatch } from '../src/grade/review.ts';

export const grade = reviewCatch({
  rule: 'REV-015',
  file: 'src/**',
  minSeverity: 'minor',
  summary:
    /dead|always (true|exists|available|passes|present)|never (false|fails)|unnecessary|redundant|not needed|no(t a)? need|since 6\.5|every (supported )?(release|version)|(in|on) (both|all) (supported )?(6\.6|minors|releases|versions)|(already|also) (exists|available|present) (in|on) 6\.6/iu,
});
