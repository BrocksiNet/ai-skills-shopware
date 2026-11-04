import { reviewCatch } from '../src/grade/review.ts';

export const grade = reviewCatch({
  rule: 'ARCH-001',
  file: 'src/**',
  minSeverity: 'major',
  summary: /LONGRUNNING_ENVIRONMENT|(?:kernel|HTTP)[^.]{0,100}(?:reset|lifecycle)/iu,
});
