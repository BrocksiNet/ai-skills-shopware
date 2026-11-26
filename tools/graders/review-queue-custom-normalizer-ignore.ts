// Intentional extra negative control for ARCH-006 (companion to
// review-queue-payload-catch / review-queue-payload-ignore in review-pairs.ts).
// BatchProducer dispatches ExportBatchMessage(includeAttachments: false) and
// the diff includes an integration test verifying the non-default boolean flag
// survives the configured Symfony Messenger serializer round-trip via the
// message's custom normalizer. A minor+ finding citing ARCH-006 or claiming
// the flag is lost across serialization is a false positive.
import { reviewIgnore } from '../src/grade/review.ts';

export const grade = reviewIgnore({
  rule: 'ARCH-006',
  summary: /serializ|round.trip|constructor default|lost[^.]{0,60}flag/iu,
});
