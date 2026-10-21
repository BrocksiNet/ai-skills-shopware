// Grader: review-optional-package-guard-catch (shopware-plugin-development, PLG-032)
// composer.json only suggests shopware/storefront and services.php guards the
// storefront subscriber with InstalledVersions. The diff registers a new
// StorefrontController subclass and imports its routes outside that guard,
// so a headless shop without the storefront fails to compile the container
// and every request 500s. Needs a major+ finding in src/ that names PLG-032
// or describes the missing guard.
import { reviewCatch } from '../src/grade/review.ts';

export const grade = reviewCatch({
  rule: 'PLG-032',
  file: 'src/**',
  minSeverity: 'major',
  summary:
    /suggest|headless|without (the )?(shopware.)?storefront|storefront (is )?(not installed|missing|absent)|guard|class_exists|InstalledVersions|optional (package|dependency)/iu,
});
