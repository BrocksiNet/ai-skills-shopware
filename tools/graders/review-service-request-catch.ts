// Grader: review-service-request-catch (sw-core-development, CORE-053)
// ProductReviewCsvExporter::export() takes a Symfony Request and reads the
// query string itself, so HTTP input reaches a domain service. Needs a major+
// finding in src/Core/ that names CORE-053 or describes the Request dependency.
import { reviewCatch } from '../src/grade/review.ts';

export const grade = reviewCatch({
  rule: 'CORE-053',
  file: 'src/Core/**',
  minSeverity: 'major',
  summary: /\bRequest\b|HttpFoundation|[Hh]exagonal|[Ii]nfrastructure|framework object|plain (?:input|value|argument)/u,
});
