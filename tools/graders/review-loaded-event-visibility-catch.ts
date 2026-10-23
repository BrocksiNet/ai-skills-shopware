// Grader: review-loaded-event-visibility-catch (sw-review-learnings, REV-035)
// The probe decides with searchIds() which category a customer can open.
// searchIds() never dispatches sales_channel.category.loaded, where Dynamic
// Access hides restricted categories, so the check still probes one the
// storefront rejects. Needs a major+ finding in src/ that names REV-035 or
// describes the missed loaded-event restriction.
import { reviewCatch } from '../src/grade/review.ts';

export const grade = reviewCatch({
  rule: 'REV-035',
  file: 'src/**',
  minSeverity: 'major',
  summary: /(\.loaded|loaded(-| )event|dynamic access|restrict|getActive|setActive|searchIds|active (flag|state) (set|changed) (by|on) (load|subscriber))/iu,
});
