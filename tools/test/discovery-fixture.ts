// Minimal synthetic repository root for discovery-pilot, transfer-eval, and
// transfer-suite unit tests. Avoids copying and hashing the full 20-skill
// library on every orchestration test.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { DISCOVERY_TASKS } from '../src/discovery-pilot.ts';
import { buildIndex, renderIndex } from '../src/router-index.ts';
import { applyTable, loadRoutes } from '../src/routes.ts';

const ROUTER_SKILL = `---
name: sw-skill-router
description: >-
  Pick the Shopware skills and references a change needs. Do NOT
  use to explain what the library offers (sw-help) or replace topic skills.
license: MIT
metadata:
  contexts: core plugin app project
  tasks: build review ship answer run
---

# Skill router

Route changes using \`scripts/route.mjs\`.
`;

const HELP_SKILL = `---
name: sw-help
description: >-
  Explain what the Shopware skills library offers and how to start.
license: MIT
metadata:
  contexts: core plugin app project
  tasks: answer
---

# Shopware skills: what you can do

Run \`/sw-help\` or install with \`npx skills add repo --skill sw-help\`.
Skills: \`sw-skill-router\`, \`sw-admin-js\`.
`;

const DOMAIN_SKILL = `---
name: sw-admin-js
description: >-
  Shopware Administration JS and Vue extension rules.
license: MIT
metadata:
  contexts: core plugin
  tasks: build review
---

# Administration JS

<!-- routes:start -->
<!-- routes:end -->
`;

const DOMAIN_ROUTES = {
  routes: [
    {
      reference: 'references/extension-api.md',
      when: 'Administration component overrides and extension API usage.',
      paths_any: ['src/Resources/app/administration/**'],
    },
  ],
};

const REFERENCE_TEXT = `# Extension API

Use \`this.$super('onSave', ...args)\` when overriding Administration component methods.
`;

const TRANSFER_TASKS = ['transfer-option-rename', 'transfer-admin-save', 'transfer-worker-reset'];
const FACT_TASKS = ['transfer-cache-minor-floor', 'transfer-admin-caption', 'transfer-acl-roundtrip'];

function write(root: string, rel: string, content: string): void {
  const file = join(root, rel);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content);
}

export function createSyntheticDiscoveryRepo(root: string): string {
  write(root, 'skills/sw-skill-router/SKILL.md', ROUTER_SKILL);
  write(
    root,
    'skills/sw-skill-router/scripts/route.mjs',
    'export const parseDiff = () => [];\nexport const route = () => ({ skills: [] });\n',
  );
  write(root, 'skills/sw-help/SKILL.md', HELP_SKILL);
  write(root, 'skills/sw-admin-js/SKILL.md', DOMAIN_SKILL);
  write(root, 'skills/sw-admin-js/routes.json', `${JSON.stringify(DOMAIN_ROUTES, null, 2)}\n`);
  write(root, 'skills/sw-admin-js/references/extension-api.md', REFERENCE_TEXT);

  const domainDir = join(root, 'skills/sw-admin-js');
  const resolved = loadRoutes(domainDir);
  if (resolved === null) throw new Error('synthetic domain skill routes missing');
  write(root, 'skills/sw-admin-js/SKILL.md', applyTable(DOMAIN_SKILL, resolved));
  write(root, 'skills/sw-skill-router/index.json', renderIndex(buildIndex(root)));

  for (const task of [...DISCOVERY_TASKS, ...TRANSFER_TASKS, ...FACT_TASKS]) {
    write(root, `evals/tasks/${task}/instruction.md`, `# Task: ${task}\n`);
  }

  write(
    root,
    'evals/experiments/discovery-transfer-v1.json',
    `${JSON.stringify(
      {
        version: 1,
        cases: TRANSFER_TASKS.map((task) => ({
          task,
          expected_references: ['sw-admin-js/references/extension-api.md'],
          outcome_kind: 'synthetic test outcome',
        })),
      },
      null,
      2,
    )}\n`,
  );

  write(
    root,
    'evals/experiments/facts-transfer-v2.json',
    `${JSON.stringify(
      {
        version: 1,
        models: ['haiku', 'sonnet', 'opus'],
        repeats: 2,
        cases: FACT_TASKS.map((task) => ({
          task,
          expected_references: ['sw-admin-js/references/extension-api.md'],
          outcome_kind: 'synthetic fact outcome',
        })),
      },
      null,
      2,
    )}\n`,
  );

  write(root, 'tools/src/stub.ts', 'export const ok = true;\n');
  write(root, 'tools/bin/stub.ts', 'export const ok = true;\n');
  write(root, 'tools/graders/stub.ts', 'export const ok = true;\n');
  write(root, 'tools/package.json', '{"name":"synthetic-tools"}\n');
  write(root, 'tools/package-lock.json', '{"lockfileVersion":3}\n');
  write(root, 'evals/tools/ast/src/stub.mjs', 'export const ok = true;\n');
  write(root, 'evals/tools/ast/package.json', '{"name":"synthetic-ast"}\n');
  write(root, 'evals/tools/ast/package-lock.json', '{"lockfileVersion":3}\n');
  write(root, 'evals/runner/stub.sh', '#!/usr/bin/env bash\n');
  return root;
}
