---
name: False trigger
about: A skill activated when it should have stayed quiet, or gave noisy/irrelevant guidance
title: "[false-trigger] <short description>"
labels: ["false-trigger"]
---

## Which skill fired incorrectly

<!-- e.g. shopware-core-development fired on plugin code -->

## The prompt / situation

<!-- What you asked. Why this skill should NOT have activated here. -->

## Which skill (if any) should have handled it instead

## Context

- Profile installed:
- Tool (Cursor / Claude Code / Codex):

## Proposed follow-up

- [ ] Tighten the skill `description` triggers / add a negative trigger
- [ ] Add a prompt to that skill's `evals/should-not-trigger.md`
