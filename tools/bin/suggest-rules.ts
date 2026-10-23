// Suggest rule changes from review signals and the drift issue (plan WP12
// step 4), with the agent you are logged in to. Writes the git-ignored
// suggestions/<date>.md and .json. docs/maintenance.md#suggesting-rule-changes
// explains the options and how to judge a proposal.
//
//   node tools/bin/suggest-rules.ts --since 2026-09-01            # all sources
//   node tools/bin/suggest-rules.ts --since 30d --skill sw-testing
//   node tools/bin/suggest-rules.ts --signals ./reviews-2026-10.jsonl --agent opencode
//
// Options: --since YYYY-MM-DD|Nd (default 30d), --until YYYY-MM-DD (default
// today), --skill NAME, --signals FILE, --agent claude|opencode|COMMAND
// (default claude; a COMMAND reads the prompt on stdin and prints the
// answer), --source ID (repeatable; review sources from the cache),
// --offline (no download, no drift issue), --out DIR, --api-index FILE,
// --baseline FILE (default the latest evals/baselines/*.jsonl), --continue
// FILE (an earlier suggestions/<date>.json: ask only the clusters it did
// not, in its window, and write both runs into one result).
//
// Environment: SUGGEST_MAX_CLUSTERS (20) caps the agent calls,
// SUGGEST_MAX_SIGNALS (25) the signals quoted per cluster, SUGGEST_MODEL
// (haiku for claude), SUGGEST_SUPPORTED_FROM (6.6.0.0) for the API check,
// GITHUB_REPOSITORY (BrocksiNet/ai-skills-shopware) for the release and the
// issue. Exit 0 = written, 1 = error, 2 = usage.
//
//   node tools/bin/suggest-rules.ts draft 2026-10-23-04 [--no-pr]
//
// Drafts one proposal (plan WP12 step 5) in a worktree on the branch
// rules/<skill>-<slug>: the agent edits with file and test tools only, the
// free checks run (one retry), eval-local runs the A/B for changed tasks, and
// a draft PR with the `run-evals` label opens unless --no-pr. --base (main)
// is the start and PR target, --worktree the folder (.cache/drafts/<branch>).
// DRAFT_MODEL (haiku), DRAFT_REPEATS (3), DRAFT_MAX_TURNS (60) and
// DRAFT_MAX_BUDGET_USD (2) set the agent. Exit 0 = drafted, 1 = not.
//
//   node tools/bin/suggest-rules.ts draft-eval TEST-020 [--no-pr]
//
// Drafts an eval for an active rule without one, on the branch
// evals/<skill>-<rule>, through the same pipeline. The PR opens only when a
// task improved with the skill on; otherwise the worktree and branch go.
// Every outcome is appended to <out>/evals.jsonl. Exit 0 = PR or drafted,
// 1 = not.
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { stderr, stdout } from '../src/cli.ts';
import { draftCommand, draftEvalCommand, draftSummary } from '../src/draft-cli.ts';
import { errorMessage } from '../src/errors.ts';
import { suggestCommand } from '../src/suggest-cli.ts';

const ROOT = resolve(import.meta.dirname, '../..');
const USAGE =
  'usage: suggest-rules.ts [--since YYYY-MM-DD|Nd] [--until YYYY-MM-DD] [--skill NAME] [--signals FILE]\n' +
  '                        [--agent claude|opencode|COMMAND] [--source ID]... [--offline] [--out DIR]\n' +
  '                        [--api-index FILE] [--baseline FILE] [--continue FILE]\n' +
  '       suggest-rules.ts draft ID [--agent claude|opencode|COMMAND] [--no-pr] [--base BRANCH]\n' +
  '                        [--out DIR] [--worktree DIR]\n' +
  '       suggest-rules.ts draft-eval RULE [same options as draft]\n';

async function main(): Promise<number> {
  let values;
  let positionals;
  try {
    ({ values, positionals } = parseArgs({
      allowPositionals: true,
      options: {
        'no-pr': { type: 'boolean', default: false },
        base: { type: 'string' },
        worktree: { type: 'string' },
        since: { type: 'string' },
        until: { type: 'string' },
        skill: { type: 'string' },
        signals: { type: 'string' },
        agent: { type: 'string', default: 'claude' },
        source: { type: 'string', multiple: true, default: [] },
        offline: { type: 'boolean', default: false },
        out: { type: 'string' },
        'api-index': { type: 'string' },
        baseline: { type: 'string' },
        continue: { type: 'string' },
      },
    }));
  } catch (error) {
    stderr(`${errorMessage(error)}\n${USAGE}`);
    return 2;
  }
  const [command, id, ...extra] = positionals;
  const drafting = command === 'draft' || command === 'draft-eval';
  if (command !== undefined && (!drafting || id === undefined || extra.length > 0)) {
    stderr(USAGE);
    return 2;
  }
  try {
    if (drafting) {
      const run = command === 'draft-eval' ? draftEvalCommand : draftCommand;
      const r = await run(ROOT, id ?? '', values, process.env, stderr);
      stdout(draftSummary(r));
      return r.status === 'drafted' || r.status === 'pr-opened' ? 0 : 1;
    }
    stdout(await suggestCommand(ROOT, values, process.env, stderr));
    return 0;
  } catch (error) {
    stderr(`suggest-rules: ${errorMessage(error)}\n`);
    return 1;
  }
}

process.exitCode = await main();
