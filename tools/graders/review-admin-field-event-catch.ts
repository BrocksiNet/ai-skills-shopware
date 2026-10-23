// Grader: review-admin-field-event-catch (sw-admin-js, ADM-044)
// SwagLoyalty supports Shopware 6.5 and 6.6. The change adds an
// sw-switch-field and an sw-single-select bound with :value and @change.
// 6.6 fields emit only update:value, so the handlers never run and the
// settings are not saved. Needs a major+ finding in the Administration
// sources that names ADM-044 or describes the dead change event.
import { reviewCatch } from '../src/grade/review.ts';

export const grade = reviewCatch({
  rule: 'ADM-044',
  file: 'src/Resources/app/administration/**',
  minSeverity: 'major',
  summary:
    /update:value|@change|\bchange\b[^.]{0,20}\bevent|\b6\.6\b|never (fires?|runs?|(gets? |is )?(emitted|called|triggered))|(is|are) not emitted|v-model:value|(does not|doesn't|do not|don't|never) (update|save|persist)/iu,
});
