// Grader: review-api-route-schema-test-ignore (sw-core-development, CORE-009)
// The route is covered by the schema test (no openapi opt-out) and its
// StoreApi/paths schema is in the diff. It only looks like the catch case, so
// any finding above nit that names CORE-009 (or CORE-008) or the schema test is
// a false positive.
import { reviewIgnore } from '../src/grade/review.ts';

export const grade = reviewIgnore({
  rule: 'CORE-009',
  also: ['CORE-008'],
  summary: /ApiRoutesHaveASchemaTest|schema test|schema coverage|not (covered|checked) by (the |any )?(schema )?test/iu,
});
