---
name: sw-podman-dev
description: >-
  Renamed to sw-local-dev, which now covers Podman and Mutagen lanes as well
  as DDEV, Docker Compose, Vagrant and native setups. Use only when the user
  names sw-podman-dev; then load and follow sw-local-dev instead. Do NOT use
  for running Shopware commands (sw-local-dev) or anything else.
license: MIT
metadata:
  contexts: core plugin app project
  tasks: answer
---

# sw-podman-dev was renamed to sw-local-dev

This skill stays for one release so existing installs keep working. Load
`sw-local-dev` and follow it; the Podman rules moved to its
`references/podman.md`.

When `sw-local-dev` is not installed, tell the user to install it:

```bash
npx skills add BrocksiNet/ai-skills-shopware --skill sw-local-dev
```

and to replace `sw-podman-dev` with `sw-local-dev` wherever they list
skills, such as the `skills` list in `~/shopware-dev/instances.json`.
