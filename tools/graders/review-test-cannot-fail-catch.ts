// Grader: review-test-cannot-fail-catch (shopware-testing, TEST-035)
// The assertions on the captured event sit inside if ($changed !== null), so
// the test passes when the event is never dispatched. Capturing in the hook
// is fine (TEST-016). Needs a major+ finding in tests/ that names TEST-035
// or describes the test that cannot fail.
import { reviewCatch } from '../src/grade/review.ts';

export const grade = reviewCatch({
  rule: 'TEST-035',
  file: 'tests/**',
  minSeverity: 'major',
  summary:
    /cannot fail|can.t fail|never fails?|passes (even )?(when|if)|silently pass|vacuous|assertNotNull|assertInstanceOf|if \(\$\w+ !== null\)|(hook|event) (was )?(never )?(fired|dispatched)/iu,
});
