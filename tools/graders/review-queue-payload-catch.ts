import { reviewCatch } from '../src/grade/review.ts';

export const grade = reviewCatch({
  rule: 'ARCH-006',
  file: 'src/**',
  minSeverity: 'major',
  summary: /serializ|round.trip|constructor default|lost[^.]{0,60}flag/iu,
});
