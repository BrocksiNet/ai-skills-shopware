// Grader: review-later-member-guard-ignore (sw-plugin-development, PLG-024)
// The same subscriber, but the getHash() call sits behind
// method_exists(HttpCacheCookieEvent::class, 'getHash'), and the class guard
// in services.php covers 6.6.0.0 to 6.6.5.x. Every release is safe. A minor+
// finding that names PLG-024 or PLG-001, or calls getHash() missing, is a
// false positive.
import { reviewIgnore } from '../src/grade/review.ts';

export const grade = reviewIgnore({
  rule: 'PLG-024',
  also: ['PLG-001'],
  summary:
    /getHash(\(\))?.{0,160}(missing|undefined|(does not|doesn't|did not) exist|not (available|present)|only (exists )?(from|since|in|on)|(added|introduced|arrived) in|6\.7\.6)|(undefined method|missing|(does not|doesn't) exist).{0,80}getHash/iu,
});
