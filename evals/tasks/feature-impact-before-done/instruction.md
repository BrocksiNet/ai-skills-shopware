# Task: review impact after the feature works

The feature is implemented and the tests pass. Do not rewrite the code first.
Review whether it should ship.

The change:

1. Store-API product listing now requires a request header
   `sw-context-analytics` so a Google Analytics client id can be sent.
2. The checkout controller always loads the analytics config and an extra
   line-item payload for every customer, including shops that never enable
   analytics.

Answer in the transcript with:

- blast radius (shared HTTP cache / who else is affected)
- who pays (all checkouts, or only shops that use analytics)
- whether the shop got easier or more complex
- a verdict: `ship`, `narrow the design`, or `do not ship`
