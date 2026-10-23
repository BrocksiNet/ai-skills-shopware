// Grader: review-migration-feature-flag-catch (sw-plugin-development, PLG-029)
// The migration branches on Feature::isActive(), so the flag state at
// migration time decides the schema for good. Needs a major+ finding in
// src/Migration/ that names PLG-029 or describes the flag-dependent schema.
import { reviewCatch } from '../src/grade/review.ts';

export const grade = reviewCatch({
  rule: 'PLG-029',
  file: 'src/Migration/**',
  minSeverity: 'major',
  summary:
    /(migration|schema|column)[^.]{0,80}(feature.?flag|Feature::|\bflag\b)|(feature.?flag|Feature::|\bflag\b)[^.]{0,80}(migration|schema|column)/iu,
});
