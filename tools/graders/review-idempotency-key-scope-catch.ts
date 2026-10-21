// Grader: review-idempotency-key-scope-catch (shopware-security, SEC-008)
// The Admin API points import replays a stored result for any request with
// the same Idempotency-Key: the store is keyed by the key alone, with no
// integration or user and no request-body hash. Another integration that
// reuses a key gets the first import's customer emails and balances. Needs
// a major+ finding in src/ that names SEC-008 or describes the unscoped key.
import { reviewCatch } from '../src/grade/review.ts';

export const grade = reviewCatch({
  rule: 'SEC-008',
  file: 'src/**',
  minSeverity: 'major',
  summary:
    /global(ly)?|unscoped|not (scoped|bound|tied)|another (integration|caller|client|user)|other (integrations?|callers?|clients?)|any (integration|caller|client)|(keyed|looked up) only by|only by the (idempotency.)?key|leak|per (integration|caller|client)/iu,
});
