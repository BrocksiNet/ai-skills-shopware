// Grader: review-test-unit-placement-ignore (sw-testing, TEST-034)
// The PR adds LoyaltyPointWriter and an integration test that writes through
// the account repository and reads the row back. That test needs the
// container, so it stays under tests/integration/. A minor+ finding that names
// TEST-034 or says the test belongs in tests/unit/ is a false positive.
import { reviewIgnore } from '../src/grade/review.ts';

export const grade = reviewIgnore({
  rule: 'TEST-034',
  summary:
    /tests\/unit|unit (suite|tests?|folder)|(belongs?|move[sd]?|should (be|live|go)).{0,40}unit|needs? no (kernel|container)|no kernel/iu,
});
