// Grader: review-api-route-schema-test-catch (sw-core-development, CORE-009)
// A new Store API route opts out of the OpenAPI schema with `openapi => false`,
// so ApiRoutesHaveASchemaTest never sees it. Needs a major+ finding in src/Core/
// that names CORE-009 (or CORE-008, the schema rule next to it), or says the
// schema test cannot cover the route.
import { reviewCatch } from '../src/grade/review.ts';

export const grade = reviewCatch({
  rule: 'CORE-009',
  also: ['CORE-008'],
  file: 'src/Core/**',
  minSeverity: 'major',
  summary: /ApiRoutesHaveASchemaTest|schema test|schema coverage|not (covered|checked) by (the |any )?(schema )?test/iu,
});
