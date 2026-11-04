import { reviewIgnore } from '../src/grade/review.ts';

export const grade = reviewIgnore({
  rule: 'ARCH-001',
  summary: /LONGRUNNING_ENVIRONMENT|(?:kernel|HTTP)[^.]{0,100}(?:reset|lifecycle)/iu,
});
