// Grader: review-event-hook-assert-ignore (sw-testing, TEST-016)
// The test captures the event in the hook and asserts after redeem(),
// including that the hook fired. A minor+ finding that names TEST-016 or
// describes assertions in the hook is a false positive.
import { reviewIgnore } from '../src/grade/review.ts';

export const grade = reviewIgnore({
  rule: 'TEST-016',
  summary:
    /assert\w*[^.]{0,80}\b(hook|closure|callback|listener)|\b(hook|closure|callback|listener)\b[^.]{0,80}assert/iu,
});
