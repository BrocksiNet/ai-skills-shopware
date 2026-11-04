# Archived evidence

Keep the result and its limitations easy to review. Historical trial details,
source snapshots embedded in reports, mutation-survivor reviews and PR
inventories live in a versioned archive. The original report paths contain
short pointers to the shared
[manifest](../evals/experiments/evidence-2026-11-04.json).

The manifest stores the repository, source commit and archive location once.
Each record has its original path, byte count, SHA-256 and summary location.
Repeated trial context is kept in the compressed historical record instead of
being copied into the reviewed JSON. Original bytes, measurements and
exclusions are preserved; archiving does not rerun or regrade an experiment.

For this batch, 15,679 lines of report JSON become 87 lines of pointers and
shared provenance. The 511,393 original bytes compress to a 64,950-byte archive.

## November 4, 2026

[Download the archive](https://github.com/BrocksiNet/ai-skills-shopware/releases/download/evidence-2026-11-04-v1/shopware-evidence-2026-11-04-v1.tar.gz)
or open the
[versioned evidence release](https://github.com/BrocksiNet/ai-skills-shopware/releases/tag/evidence-2026-11-04-v1).
It contains eight original JSON records and `records.sha256`. Their source is
[commit cb95aaf](https://github.com/BrocksiNet/ai-skills-shopware/commit/cb95aaf878ba0e7ac7bd2e7ad783659718d72d99).
The links below also open each original directly at that commit, independently
of release-asset availability.

The human-readable results remain in
[results.md](results.md), [testing-quality.md](testing-quality.md) and the
[maintenance report](skill-maintenance-2026-11-04.md). Runnable experiment
protocols, fixtures and graders stay in the checkout. Local raw trace
directories named in the original reports are separate from this archive.

### Quality audits

| Original record | Summary |
| --- | --- |
| [Initial quality measurements](https://github.com/BrocksiNet/ai-skills-shopware/blob/cb95aaf878ba0e7ac7bd2e7ad783659718d72d99/docs/quality-checks-2026-11-04.json) | [Original baseline](testing-quality.md#original-coverage-and-validation-baseline) |
| [Seeded-fault replay](https://github.com/BrocksiNet/ai-skills-shopware/blob/cb95aaf878ba0e7ac7bd2e7ad783659718d72d99/docs/quality-seeded-faults-2026-11-04.json) | [Runtime contracts](testing-quality.md#runtime-and-dependency-contracts) |
| [95% mutation follow-up](https://github.com/BrocksiNet/ai-skills-shopware/blob/cb95aaf878ba0e7ac7bd2e7ad783659718d72d99/docs/quality-95-2026-11-04.json) | [Final scoped scores and survivor review](testing-quality.md#95-gate-and-cli-workflow-follow-up--november-4-2026) |

### Skill experiments

| Original record | Summary |
| --- | --- |
| [Discovery screen](https://github.com/BrocksiNet/ai-skills-shopware/blob/cb95aaf878ba0e7ac7bd2e7ad783659718d72d99/evals/experiments/discovery-2026-11-04.json) | [Selection ceiling](results.md#discovery-consolidation-screen--november-4-2026) |
| [Reference and code transfer](https://github.com/BrocksiNet/ai-skills-shopware/blob/cb95aaf878ba0e7ac7bd2e7ad783659718d72d99/evals/experiments/discovery-transfer-2026-11-04.json) | [First transfer comparison](results.md#reference-retrieval-and-code-transfer--november-4-2026) |
| [Fact-sensitive transfer](https://github.com/BrocksiNet/ai-skills-shopware/blob/cb95aaf878ba0e7ac7bd2e7ad783659718d72d99/evals/experiments/facts-transfer-2026-11-04.json) | [Three-model comparison and exclusions](results.md#fact-sensitive-transfer-across-three-models--november-4-2026) |
| [Queue-rule development screen](https://github.com/BrocksiNet/ai-skills-shopware/blob/cb95aaf878ba0e7ac7bd2e7ad783659718d72d99/evals/experiments/queue-screen-2026-11-04.json) | [Candidate left unpublished](skill-maintenance-2026-11-04.md#a-candidate-rejected-by-development-screening) |

### Maintenance review

The [original maintenance record](https://github.com/BrocksiNet/ai-skills-shopware/blob/cb95aaf878ba0e7ac7bd2e7ad783659718d72d99/docs/skill-maintenance-2026-11-04.json)
contains the PR inventory, review links and per-skill decisions. See the
[maintenance summary](skill-maintenance-2026-11-04.md).

### Sensitive-mail development screen

The [compact record](../evals/experiments/security-mail-screen-v1.json)
contains the result, limitations, prospective protocol hash and archive hash.
The local, git-ignored archive at
`evals/.results/security-mail-screen-2026-11-04-v1.tar.gz` preserves the complete
unpublished development screen, including runnable inputs, packages, scripts,
grader outputs, raw traces and replay instructions. It was not uploaded.
Its summary is in [results.md](results.md#sensitive-mail-development-screen--november-4-2026).

The archive is 233,971 bytes. Its local copy was verified against the compact
record and every member hash. To inspect it, verify its SHA-256, extract it,
and run `shasum -a 256 -c records.sha256` inside
`security-mail-study-2026-11-04/`. The original frozen input list is separate
from the later source audit. No skill or shared grader changed after this screen.

## Download and verify

### Administration workflow and binding studies

The [decision record](../evals/experiments/admin-decisions-2026-11-04.json)
stores both local archive paths, sizes, SHA-256 hashes, frozen protocol/input
hashes, outcomes and exclusions. Full traces, edited workdirs, source snapshots,
calibration and replay oracles stay in the git-ignored archives under
`evals/.results/`; no raw evidence was uploaded. The
[summary](results.md#admin-form-binding-decision--november-4-2026) distinguishes
the failed prospective gate from the exploratory engineering recommendation.

Verify an archive against the record before extracting it. Run
`shasum -a 256 -c records.sha256` and then
`shasum -a 256 -c frozen-inputs.sha256` inside its study directory. Both
extracted archives were verified this way. Their READMEs describe the pinned
runtimes and replay limits; `node_modules` is omitted.

### Historical release archive

Run from the repository root. Verification uses Node 24 and standard archive
tools; no additional package or evidence runner is required. The hash in the
committed manifest is checked before extraction, then every original record
is checked against the archive's file manifest.

```bash
evidence_dir="$(mktemp -d)"
gh release download evidence-2026-11-04-v1 \
  --repo BrocksiNet/ai-skills-shopware \
  --pattern shopware-evidence-2026-11-04-v1.tar.gz --dir "$evidence_dir"

node --input-type=module - "$evidence_dir" <<'JS'
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
const manifest = JSON.parse(readFileSync('evals/experiments/evidence-2026-11-04.json', 'utf8'));
const bytes = readFileSync(`${process.argv[2]}/shopware-evidence-2026-11-04-v1.tar.gz`);
assert.equal(createHash('sha256').update(bytes).digest('hex'), manifest.archive.sha256);
JS

tar -xzf "$evidence_dir/shopware-evidence-2026-11-04-v1.tar.gz" -C "$evidence_dir"
(cd "$evidence_dir" && shasum -a 256 -c records.sha256)
```

Files are extracted under their original repository-relative paths in the
temporary directory. They can be read without overwriting the pointer files.

## Adding future evidence

- Keep compact protocols, result summaries, exclusions and content hashes in
  Git. A complete unpublished development screen may keep its runnable inputs
  in a verified archive; label local-only evidence explicitly. Published
  regression fixtures stay in the checkout.
  Define shared package, prompt and configuration data once in the
  experiment manifest; trials refer to those definitions and record outcomes.
- Archive detailed observations and inventories in a versioned release asset
  before replacing a report with a pointer. Verify a downloaded copy against
  the committed hashes. Publish a new version for corrections; never overwrite
  an existing evidence asset.
- Mark evidence releases as prereleases with `--latest=false`, as the API-index
  release does. Skill version checks must continue to see the actual skills
  release. Evidence assets have no Actions-artifact expiry.
- Keep a pinned Git source for records already committed, and preserve raw
  measurements when an oracle is repaired. Repaired tasks are regression data.

This reduces checkout and review noise. The original large records remain in
Git history, so this cleanup does not shrink existing repository history.
