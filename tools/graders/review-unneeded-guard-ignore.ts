// Grader: review-unneeded-guard-ignore (sw-review-learnings, REV-015)
// SwagMediaCdn registers a RemoteMediaImporter behind
// class_exists(MediaUploadService::class). MediaUploadService arrived in
// 6.7.1.0, so 6.6.0.0 to 6.7.0.x skip the importer and the guard is needed. A
// minor+ finding that names REV-015 or calls the guard dead is a false
// positive.
import { reviewIgnore } from '../src/grade/review.ts';

export const grade = reviewIgnore({
  rule: 'REV-015',
  summary:
    /dead|always (true|exists|available|passes|present)|never (false|fails)|unnecessary|redundant|not needed|no(t a)? need|since 6\.5|every (supported )?(release|version)|(in|on) (both|all) (supported )?(6\.6|minors|releases|versions)|(already|also) (exists|available|present) (in|on) 6\.6/iu,
});
