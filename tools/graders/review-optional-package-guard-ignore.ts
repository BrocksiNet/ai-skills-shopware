// Grader: review-optional-package-guard-ignore (shopware-plugin-development, PLG-032)
// The same storefront page, registered and routed inside the existing
// InstalledVersions guard for the suggested shopware/storefront package. A
// minor+ finding that names PLG-032 or calls the storefront dependency
// unguarded is a false positive.
import { reviewIgnore } from '../src/grade/review.ts';

export const grade = reviewIgnore({
  rule: 'PLG-032',
  summary:
    /suggest|headless|without (the )?(shopware.)?storefront|storefront (is )?(not installed|missing|absent)|guard|class_exists|InstalledVersions|optional (package|dependency)/iu,
});
