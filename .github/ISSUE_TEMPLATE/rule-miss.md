---
name: Rule miss
about: The agent did something a skill should have prevented or corrected
title: "[rule-miss] <short description>"
labels: ["rule-miss", "review-learning"]
---

## What the agent did wrong

<!-- The incorrect output / decision. Paste the relevant code or guidance. -->

## What it should have done

<!-- The correct Shopware behavior, and why. -->

## Which skill should have caught it

<!-- e.g. shopware-plugin-development, php-foundation, ... -->

## Context

- Shopware version:
- Profile installed:
- Tool (Cursor / Claude Code / Codex):
- Prompt used:

## Does this recur?

<!-- Delta principle: include this only if it happens repeatedly and the base
     model gets it wrong for Shopware specifically. -->

## Proposed follow-up

- [ ] Add/adjust a rule in the owning skill
- [ ] Add an `evals/tasks/<rule>/` so it is caught automatically
