This plugin uses the Shopware asynchronous transport and its Symfony JSON serializer.
The handler sends a completion notification only when the decoded message's isNotify() returns true.
The producer deliberately sends notify=false for intermediate batches. No serializer groups,
attributes, custom normalizers or per-transport serializer overrides are configured.
The handler also reads includeAttachments() on the decoded message to decide whether to export attachments. The producer sends includeAttachments=false for privacy-sensitive batches. The new field must survive transport serialization. The existing isNotify() accessor remains unchanged.

Legacy batches intentionally include attachments. Preserving includeAttachments=true when an older producer omits the new field is a compatibility requirement, not an authorization decision. Privacy-sensitive producers explicitly pass false; that value must survive the queue. The handler-facing includeAttachments() accessor is required by this change's consumer contract. An additional isIncludeAttachments() accessor may expose the same value to the normalizer; it does not replace the handler-facing accessor. Integration-test bootstrap and plugin autoloading already exist outside this diff.
