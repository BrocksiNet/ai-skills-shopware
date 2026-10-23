---
name: sw-help
description: >-
  Explain what the Shopware skills library can do and how to start. Use when
  the user asks "what can the Shopware skills do", "sw help", "which Shopware
  skills are there" or "how do I use these skills", or is new to the library
  and does not know which skill to ask for. Answers with the skills grouped by
  what the user wants to do, example prompts, and how to install more. Do NOT
  use to pick the skills for a concrete diff or plan (sw-skill-router) or for
  Shopware questions themselves.
license: MIT
metadata:
  contexts: core plugin app project
  tasks: answer
---

# Shopware skills: what you can do

Answer from this page. Keep it short: show the group that matches what the
user is doing, or the overview when they asked in general. When
`sw-skill-router` is installed, `node <router-folder>/scripts/route.mjs --list`
shows which skills are installed here.

## How the skills work

- Skills load by themselves when a request matches their description. Naming
  one ("use sw-testing") forces it.
- Not sure which one? Run `/sw-skill-router`, or ask "which skill should I
  use for this change". It reads the diff or the planned files, detects core,
  plugin, app or project, and lists the skills and references to load.
- Every rule has an ID such as `PLG-028`. A review cites the ID, so a finding
  can be looked up.

## Build something

| You want to | Skill | Try |
| ----------- | ----- | --- |
| Write plugin or project backend code | `sw-plugin-development` | "Add a scheduled task to my plugin" |
| Build an app (manifest, app scripts, webhooks) | `sw-app-development` | "Should this be an app or a plugin?" |
| Change shopware/shopware without breaking extensions | `sw-core-development` | "Deprecate this public method properly" |
| Change the Administration (Vue, Meteor, Pinia) | `sw-admin-js` | "Override this sw-product-detail component" |
| Change the Storefront (Twig, SCSS, JS plugins) | `sw-storefront` | "Extend the product box template" |
| Write modern, strict PHP | `sw-php-foundation` | "Turn these constants into a backed enum" |
| Write or fix PHPUnit tests | `sw-testing` | "Write a unit test for this service" |
| Handle routes, ACL, secrets and webhooks safely | `sw-security` | "Is this Store-API route safe?" |
| Choose an architecture: event, decorator, new entity | `sw-architecture` | "Event or decorator for this change?" |

## Before you ship

| You want to | Skill | Try |
| ----------- | ----- | --- |
| Check cache, performance and who pays for a working change | `sw-change-impact` | "This works. What breaks for other shops?" |
| Write the shopware/shopware pull request body | `sw-pr-description` | "Fill the PR template for this branch" |

## Review

| You want to | Skill | Try |
| ----------- | ----- | --- |
| Review a plugin or app diff with rule IDs and severities | `sw-extension-review` | "Review my plugin PR" |
| Find what reviewers keep flagging in Shopware code | `sw-review-learnings` | "What would a reviewer flag here?" |
| Answer review comments on a shopware/shopware PR | `sw-pr-review` | "Help me reply to these review comments" |

## Run, research and answer

| You want to | Skill | Try |
| ----------- | ----- | --- |
| Run tests, linters and the dev environment in the right place | `sw-podman-dev` | "Run phpunit for this test on my lane" |
| Research instead of guessing, and escalate when stuck | `sw-research-and-escalation` | "Does this service exist in 6.6?" |
| Write short, plain answers and support replies | `sw-assistant-style` | "Draft a reply to this customer ticket" |

## About the library

| You want to | Skill | Try |
| ----------- | ----- | --- |
| Find the skills a change or plan needs | `sw-skill-router` | `/sw-skill-router` |
| See this overview | `sw-help` | `/sw-help` |

## Install more

All skills come from one repository. Install one by name, or a set from the
use-case pages in the repository's `use-cases/` folder:

```bash
npx skills add BrocksiNet/ai-skills-shopware --skill sw-skill-router --skill sw-help
```

In a shopware/shopware checkout that has its own `.agents/skills`, the core
skills lead for platform work and these skills are an overlay.
