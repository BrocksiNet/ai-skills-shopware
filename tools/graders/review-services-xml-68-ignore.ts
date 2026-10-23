// Grader: review-services-xml-68-ignore (sw-plugin-development, PLG-026)
// The change registers the same services in services.php and adds fields to
// config.xml. config.xml is plugin configuration, not DI, and keeps working
// on 6.8. A minor+ finding that names PLG-026 or calls an XML file a 6.8
// boot problem is a false positive; a nit that says config.xml is fine is not.
import { reviewIgnore } from '../src/grade/review.ts';

export const grade = reviewIgnore({
  rule: 'PLG-026',
  summary:
    /services\.xml|xml (service|di|container|config(uration)?)( file)? (loader|loading|files?)|\b6\.8\b|symfony 8/iu,
});
