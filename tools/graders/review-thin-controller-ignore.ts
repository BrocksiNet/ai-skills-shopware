// Grader: review-thin-controller-ignore (sw-plugin-development, PLG-006)
// The same balance route, but the controller calls one injected
// LoyaltyBalanceCalculator, which runs the query and picks the tier. A
// minor+ finding that names PLG-006 or says the controller holds the logic
// is a false positive.
import { reviewIgnore } from '../src/grade/review.ts';
import { SUMMARY } from './review-thin-controller-catch.ts';

export const grade = reviewIgnore({ rule: 'PLG-006', summary: SUMMARY });
