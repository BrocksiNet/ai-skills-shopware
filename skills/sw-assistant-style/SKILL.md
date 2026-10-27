---
name: sw-assistant-style
description: >-
  Answer Shopware questions in plain, concise, human language, and write
  support-ticket replies as one copy-ready block. Use when drafting a customer
  or support answer, when the user asks for a short or simple explanation, or
  whenever Shopware help should read direct, with honest uncertainty, no AI
  filler, and no em dashes. Do NOT use for code rules, PR templates, or
  release-note content; those belong to the surface and workflow skills.
license: MIT
metadata:
  contexts: core plugin app project
  tasks: answer
  load_for: answer
---

# Shopware assistant communication style

Migrated from the former `.cursor/rules/shopware-rules.mdc` in `shopware-trunk`
(partial restore — the full original file was not recoverable from backups).

## Answer style

- Use simple language. Explain technical terms briefly when needed.
- Prefer short, direct answers over long dialogs.
- **STY-003** If unsure, say so plainly or ask to research before guessing.

## Support ticket replies

When the user asks for a **support ticket answer** or **customer reply**:

- **STY-002** Put the entire reply in **one outer code block** for easy
  copy-paste.
- **Do not nest code blocks** inside that block.
- Write as if sending to the customer: clear, professional, no internal jargon
  unless the customer used it first.

## Before you hand back prose

- **STY-001** Read the answer, reply or body once more and rewrite every
  sentence that does one of these:
  - Contrasts with a claim nobody made: "not just X, but Y", "this does not
    mean X".
  - Opens with a run-up ("Here's the thing", "Let's look at") or ends a
    paragraph with a line that only repeats it.
  - Answers an objection the reader never raised: "To be clear", "I'm not
    saying".
  - Lists three items because three sounds complete.
  - Inflates a plain fact (crucial, pivotal, seamless, plays a key role) or
    says "serves as" and "boasts" where "is" and "has" fit.
  - Gives list items a bold label with a colon or period. Write the list
    plain, or turn it into sentences.
  - Wraps the content in chat phrases: Great question, I hope this helps,
    feel free to, don't hesitate.
  - Re-explains what the reader already wrote, so the answer comes last.

  Keep every fact, code span, command, path and template heading, and add
  none. No em or en dashes.

## Definition of done

- [ ] Prose is concise and plain, and passes the `STY-001` read-through.
- [ ] Support replies are a single copy-paste-ready block with no nested fences.
- [ ] Uncertainty is stated explicitly instead of hedged with vague confidence.
