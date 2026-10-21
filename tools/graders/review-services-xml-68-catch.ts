// Grader: review-services-xml-68-catch (shopware-plugin-development, PLG-026)
// SwagLoyalty supports Shopware 6.7 and 6.8 and already registers its
// services in services.php. The change registers the new expiry reminder
// services in a new services.xml. Symfony 8 (6.8) drops the XML loader, so
// the plugin fails to boot on 6.8. Needs a major+ finding in the plugin
// config that names PLG-026 or describes the XML DI file.
import { reviewCatch } from '../src/grade/review.ts';

export const grade = reviewCatch({
  rule: 'PLG-026',
  file: 'src/Resources/config/**',
  minSeverity: 'major',
  summary:
    /services\.xml|xml (service|di|container|config(uration)?) (loader|files?)|\b6\.8\b|symfony 8|services\.php/iu,
});
