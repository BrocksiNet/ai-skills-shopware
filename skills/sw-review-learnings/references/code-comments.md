# Code comment review findings

Load this when a change adds or edits comments and docblocks. Seeded from
shopware/shopware reviews (#19917, #20855), where agents wrote the story of
the pull request into the code.

## Recurring findings

- **REV-034** **Comments describe the code, not its history.** A comment or
  docblock tells how the change came about: an earlier revision of the pull
  request, code that was removed again, the bug hunt, "previously", "no
  longer", "instead of the old …", or an issue number as the reason the code
  looks the way it does. The reader of the file never saw those versions, and
  the text is wrong after the next change. Keep the constraint the code must
  still respect, in one sentence. The story goes into the pull request body
  and the commit message.

  Fine as they are:
  - a link to an upstream bug next to a workaround, saying when it can go
    (`// Symfony 8.1 removes this requirement: symfony/symfony#63751`);
  - `@deprecated tag:vX.Y.Z` notes, which describe the future, not the past;
  - `@see` to the test that covers the code.

## How to report it

Severity `minor`, or `nit` for a single sentence. Quote the sentence and
suggest the one that should stay. Comments that only restate the code are
core's code-style review topic, not this rule.
