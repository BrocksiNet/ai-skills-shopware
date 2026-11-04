import { reviewIgnore } from '../src/grade/review.ts';

export const grade = reviewIgnore({
  rule: 'ARCH-006',
  summary: /serializ|round.trip|constructor default|lost[^.]{0,60}flag/iu,
});
