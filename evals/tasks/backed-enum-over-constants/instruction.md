# Task: moderation state for product reviews (core)

You are working on Shopware core (`shopware/shopware` trunk). Product reviews
get a moderation state: pending, approved or rejected. A migration in the same
PR adds the `moderation_state` column and the `moderationState` field, which
store the strings `pending`, `approved` and `rejected`.

Add `ProductReviewModerator` next to `ProductReviewLoader` in
`src/Core/Content/Product/SalesChannel/Review/`. It sets the moderation state
of one review through the `product_review` repository. Leave the migration,
the field and the service wiring to us.
