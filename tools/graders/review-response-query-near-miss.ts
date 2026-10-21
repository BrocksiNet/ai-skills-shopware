// Grader: review-response-query-near-miss (decoy SF-013)
// A BeforeSendResponseEvent subscriber reads the loyalty config with a raw
// query on every HTML response, cache hits included. The HTTP cache stays
// on, so SF-013 does not cover it, and no other rule does. Needs a minor+
// finding in src/ that describes the query per response, under no catalog
// ID; citing SF-013 for it fails.
import { reviewNearMiss } from '../src/grade/review.ts';

export const grade = reviewNearMiss({
  rule: 'SF-013',
  accept: [],
  file: 'src/**',
  minSeverity: 'minor',
  summary:
    /\b(every|each|per|all)\b[^.]{0,30}\b(responses?|requests?|page ?views?|pages?)\b|cache hits?|uncached [^.]{0,20}(query|select|read|lookup)|round.?trip/iu,
});
