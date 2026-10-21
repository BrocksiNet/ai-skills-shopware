// Grader: review-storefront-default-context-ignore (shopware-plugin-development, PLG-016)
// The change adds the same pagelet but searches sales_channel.product.repository
// with the SalesChannelContext and renders calculatedPrice, like the existing
// highlights loader. A minor+ finding that names PLG-016 or calls the context
// or the listed products wrong is a false positive.
import { reviewIgnore } from '../src/grade/review.ts';

export const grade = reviewIgnore({
  rule: 'PLG-016',
  summary:
    /createDefaultContext|default context|sales.channel (context|repositor)|visib|inactive|language|currency|(customer group|rule) prices?|calculatedPrice/iu,
});
