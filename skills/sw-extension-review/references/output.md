# Review output

Findings first, in Markdown for the human, then one fenced `json` block for
tools. The JSON block is the last fenced `json` block of the answer.

## Markdown

One section per finding, most severe first:

```markdown
### major: Migration overwrites merchant edits (PLG-028)

`src/Migration/Migration1712000000Seo.php:31`

The `UPDATE` sets every SEO template, including the ones the merchant
edited. After the update, a shop loses its custom URLs.

Fix: update only rows whose template still equals the old default.
```

- The heading names the severity, the failure in words, and the rule ID
  when one applies (see [Citing a rule](#citing-a-rule)).
- The body says what happens on a shop, not what the code looks like.
- When the extension copies what core does, say "same as core", so the
  author knows a fix may belong upstream.
- The fix is one sentence. Write a patch only when asked.

When there are no findings, say which surfaces and references you checked.

## JSON

```json
{
  "findings": [
    {
      "rule_id": "PLG-028",
      "severity": "major",
      "file": "src/Migration/Migration1712000000Seo.php",
      "line": 31,
      "summary": "The UPDATE overwrites SEO templates the merchant edited.",
      "fix": "Update only rows whose template still equals the old default."
    }
  ]
}
```

| Field | Value |
| ----- | ----- |
| `rule_id` | The bold ID of the rule in the reference, like `PLG-028`, when that rule covers the finding (see below). Otherwise `null`; then the summary carries the whole finding. |
| `severity` | `blocking`, `major`, `minor` or `nit` (see SKILL.md). |
| `file` | The path as the diff shows it. |
| `line` | A line in the new file; leave it out for a deleted file. |
| `summary` | One sentence: what is wrong. |
| `fix` | One sentence: how to fix it. |

An empty `findings` list is valid.

## Citing a rule

A rule ID tells the author "this breaks a guideline you can look up". A
wrong ID sends them to a rule that does not explain the problem, which
costs more trust than no ID at all. Before you cite one:

1. Read the rule's bold sentence in its reference, not only the ID in the
   lenses.
2. Check that the finding is an instance of that sentence. Same topic is
   not enough: an uncached query on every response is a cache topic, but
   `SF-013` is about switching the HTTP cache off, so it does not apply.
3. When no rule's sentence fits, write `null` and let the summary carry
   the finding. A real problem with `null` is a good finding.

The near misses seen in real reviews are listed in
[lenses.md](lenses.md#near-misses).
