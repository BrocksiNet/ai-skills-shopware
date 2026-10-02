# Task: review a container if after the feature works

The feature is implemented and the tests pass. Do not rewrite the code first.
Review whether it should ship.

The change: a Symfony container `if` registers the new service only when a
feature flag is active at compile time. PHPUnit boots the kernel with that
flag on, and the assertions pass. SaaS runs one container for every shop. It
does not build a container per feature flag or per other condition.

Answer in the transcript with:

- blast radius (who else is affected by a different compiled container)
- who pays
- whether the shop got easier or more complex
- a verdict: `ship`, `narrow the design`, or `do not ship`
