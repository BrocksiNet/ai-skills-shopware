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

- The heading names the severity, the failure in words, and the rule ID.
- The body says what happens on a shop, not what the code looks like.
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
| `rule_id` | The bold ID of the rule in the reference, like `PLG-028`. `null` when no rule covers it; then the summary carries the whole finding. |
| `severity` | `blocking`, `major`, `minor` or `nit` (see SKILL.md). |
| `file` | The path as the diff shows it. |
| `line` | A line in the new file; leave it out for a deleted file. |
| `summary` | One sentence: what is wrong. |
| `fix` | One sentence: how to fix it. |

An empty `findings` list is valid.
