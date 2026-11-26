// Intentional extra negative control for ARCH-001 (companion to
// review-reset-interface-catch / review-reset-interface-ignore in
// review-pairs.ts).
// LoyaltyConfigReader already has reset(string $salesChannelId), which deletes
// the channel's settings, so it cannot implement ResetInterface. The change
// memoizes the config, clears it in resetAll(), and tags the service
// `kernel.reset` with method="resetAll". A minor+ finding naming ARCH-001,
// asking for ResetInterface, or calling the memo unreset is a false positive.
import { reviewIgnore } from '../src/grade/review.ts';
import { PAIRS } from './review-pairs.ts';

const pair = PAIRS['reset-interface'];
if (pair === undefined) throw new Error('review-pairs.ts has no reset-interface entry');

export const grade = reviewIgnore({ rule: pair.rule, summary: pair.summary });
