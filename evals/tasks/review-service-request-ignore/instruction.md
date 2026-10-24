# Task: review my change

`diff.patch` is a change to my Shopware extension.

Review the diff. Do not edit any file. End your answer with exactly one fenced
`json` block in this shape:

```json
{
  "findings": [
    {
      "rule_id": "ID of the guideline the finding breaks, or null",
      "severity": "blocking | major | minor | nit",
      "file": "path from the diff",
      "line": 42,
      "summary": "One sentence: what is wrong.",
      "fix": "One sentence: how to fix it."
    }
  ]
}
```

Report only real problems. An empty `findings` list is a valid answer.
