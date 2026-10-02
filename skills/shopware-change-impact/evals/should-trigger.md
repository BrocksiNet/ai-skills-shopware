# shopware-change-impact — should trigger

- The feature is done, review the impact before we ship it.
- What is the blast radius of this new Store-API header?
- Does loading analytics on checkout slow it for customers who do not use analytics?
- The ticket works. Did the shop get easier, or just more complex?
- Before we call this done, who else pays for this change?
- Asset loading only tested locally. Does this still work when assets are on S3?
- This Symfony container if is per feature flag. Do we still have one container?
