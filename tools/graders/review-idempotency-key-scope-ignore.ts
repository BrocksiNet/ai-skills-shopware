// Grader: review-idempotency-key-scope-ignore (shopware-security, SEC-008)
// The same idempotent points import, but the store is keyed by the calling
// integration or user plus the key and keeps a sha256 of the request body,
// answering 422 on a mismatch. A minor+ finding that names SEC-008 or calls
// the replay unscoped or leaking is a false positive.
import { reviewIgnore } from '../src/grade/review.ts';

export const grade = reviewIgnore({
  rule: 'SEC-008',
  summary:
    /global(ly)?|unscoped|not (scoped|bound|tied)|another (integration|caller|client|user)|other (integrations?|callers?|clients?)|any (integration|caller|client)|(keyed|looked up) only by|only by the (idempotency.)?key|leak|per (integration|caller|client)/iu,
});
