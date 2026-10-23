// Grader: review-acl-system-config-ignore (sw-admin-js, ADM-043)
// The settings card goes through the plugin's own Admin API route, guarded by
// swag_loyalty.viewer and swag_loyalty.editor, which reads and writes only
// SwagLoyalty.config keys; the role mapping adds swag_loyalty_tier:read only.
// SystemConfigService in the controller is fine. A minor+ finding that names
// ADM-043 or claims the role exposes system_config or all config domains is
// a false positive.
import { reviewIgnore } from '../src/grade/review.ts';

export const grade = reviewIgnore({
  rule: 'ADM-043',
  summary:
    /system[_ .-]?config(uration)?[ _]?(:|privileges?|permissions?|read|update|acl|access|values|settings|entries|api)|system_config\b|every (extension|plugin|app|config)\S*\s+(settings|config|configuration|values)|(all|any|other) (config(uration)? )?domains|(all|other|every) (extensions?|plugins?|apps?)\W{0,2}s?\W? (settings|config|configuration|secrets?|api keys?|credentials?)|(secrets?|api keys?|credentials?|passwords?)[^.]{0,40}(other|every|all) (extensions?|plugins?|apps?)/iu,
});
