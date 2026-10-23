// Grader: review-acl-system-config-catch (sw-admin-js, ADM-043)
// A new Loyalty settings card loads and saves through systemConfigApiService,
// so the plugin's role mapping now grants system_config:read and
// system_config:update. That lets a loyalty user read and change every
// extension's settings, secrets included. Needs a major+ finding in the
// plugin sources that names ADM-043 or describes the system_config grant.
import { reviewCatch } from '../src/grade/review.ts';

export const grade = reviewCatch({
  rule: 'ADM-043',
  file: 'src/**',
  minSeverity: 'major',
  summary:
    /system[_ .-]?config(uration)?[ _]?(:|privileges?|permissions?|read|update|acl|access|values|settings|entries|api)|system_config\b|every (extension|plugin|app|config)\S*\s+(settings|config|configuration|values)|(all|any|other) (config(uration)? )?domains|(all|other|every) (extensions?|plugins?|apps?)\W{0,2}s?\W? (settings|config|configuration|secrets?|api keys?|credentials?)|(secrets?|api keys?|credentials?|passwords?)[^.]{0,40}(other|every|all) (extensions?|plugins?|apps?)/iu,
});
