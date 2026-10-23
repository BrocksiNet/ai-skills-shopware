// Grader: review-released-signature-catch (sw-review-learnings, REV-036)
// The change adds a required parameter to a released Store-API route's load()
// with no NewRequiredParameter marker, so existing callers and subclasses break.
// Needs a major+ finding in src/ that names REV-036 or describes the unmarked
// required parameter. A finding that only asks for a caller grep (REV-003) is
// not the rule.
import { reviewCatch } from '../src/grade/review.ts';

export const grade = reviewCatch({
  rule: 'REV-036',
  file: 'src/**',
  minSeverity: 'major',
  summary:
    /(NewRequiredParameter|required (\$?\w+ )?parameter|new parameter|deprecat|marker|signature|public api|breaks? (callers|subclasses|existing))/iu,
});
