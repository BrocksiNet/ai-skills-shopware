// Grader: review-admin-field-event-ignore (shopware-admin-js, ADM-044)
// The change adds the same two fields bound with v-model:value, which works
// on 6.5 (falls back to the change event) and 6.6 (update:value). A minor+
// finding that names ADM-044 or calls the binding broken is a false
// positive.
import { reviewIgnore } from '../src/grade/review.ts';

export const grade = reviewIgnore({
  rule: 'ADM-044',
  summary:
    /update:value|@change|\bchange\b[^.]{0,20}\bevent|\b6\.6\b|never (fires?|runs?|(gets? |is )?(emitted|called|triggered))|(is|are) not emitted|v-model:value|(does not|doesn't|do not|don't|never) (update|save|persist)/iu,
});
