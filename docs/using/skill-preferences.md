# Skill preferences: one skill, your answers

Some choices in a skill are personal: where your worktrees live, which short
name a repository gets. The skill stays the same for everyone; your answers
stay on your machine.

| File | Holds | Where |
| ---- | ----- | ----- |
| `SKILL.md` | the how, the same for everyone | this repository |
| `preferences.example.md` | the questions, with the defaults | this repository, next to `SKILL.md` |
| `preferences.md` | your answers | `${AI_SKILLS_SHOPWARE_PREFS_DIR:-~/.config/ai-skills-shopware}/<skill-name>/preferences.md`, never committed |

## Using it

Copy a skill's `preferences.example.md` to the path above and change the
values, or let the agent ask you the questions when a preference first
matters. Set `AI_SKILLS_SHOPWARE_PREFS_DIR` to keep the files somewhere else,
for example in your dotfiles.

## Opting a skill in

1. Add `preferences.example.md` next to `SKILL.md`: a short intro with the
   path, then one fenced YAML block with each key, its default, and the
   question as a comment. No personal values.
2. In `SKILL.md`, link the example, name the path with
   `AI_SKILLS_SHOPWARE_PREFS_DIR`, and list the configurable keys with their
   defaults in a table.
3. Tell the agent, in a rule with an ID and an eval:
   - read the personal file when it exists; its values override the documented
     defaults;
   - apply only the keys in the table. A preference never overrides a safety
     rule;
   - when the file is missing, use the defaults. When a preference matters for
     the task, offer to create the file by asking the example's questions, and
     write it only with the user's answers.

`scripts/validate-skills.sh` checks that a skill with `preferences.example.md`
links it and names `AI_SKILLS_SHOPWARE_PREFS_DIR`, and that no skill folder
holds a `preferences.md`.

First user: `sw-worktrees` ([`SKILL.md`](../../skills/sw-worktrees/SKILL.md),
[`preferences.example.md`](../../skills/sw-worktrees/preferences.example.md)).
