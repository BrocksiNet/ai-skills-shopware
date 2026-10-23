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
// --baseline FILE (default the latest evals/baselines/*.jsonl).
//
// Environment: SUGGEST_MAX_CLUSTERS (20) caps the agent calls,
// SUGGEST_MAX_SIGNALS (25) the signals quoted per cluster, SUGGEST_MODEL
// (haiku for claude), SUGGEST_SUPPORTED_FROM (6.6.0.0) for the API check,
// GITHUB_REPOSITORY (BrocksiNet/ai-skills-shopware) for the release and the
// issue. Exit 0 = written, 1 = error, 2 = usage.
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { stderr, stdout } from '../src/cli.ts';
import { errorMessage } from '../src/errors.ts';
import { suggestCommand } from '../src/suggest-cli.ts';

const ROOT = resolve(import.meta.dirname, '../..');
const USAGE =
  'usage: suggest-rules.ts [--since YYYY-MM-DD|Nd] [--until YYYY-MM-DD] [--skill NAME] [--signals FILE]\n' +
  '                        [--agent claude|opencode|COMMAND] [--source ID]... [--offline] [--out DIR]\n' +
  '                        [--api-index FILE] [--baseline FILE]\n';

async function main(): Promise<number> {
  let values;
  try {
    ({ values } = parseArgs({
      options: {
        since: { type: 'string', default: '30d' },
        until: { type: 'string' },
        skill: { type: 'string' },
        signals: { type: 'string' },
        agent: { type: 'string', default: 'claude' },
        source: { type: 'string', multiple: true, default: [] },
        offline: { type: 'boolean', default: false },
        out: { type: 'string' },
        'api-index': { type: 'string' },
        baseline: { type: 'string' },
      },
    }));
  } catch (error) {
    stderr(`${errorMessage(error)}\n${USAGE}`);
    return 2;
  }
  try {
    stdout(await suggestCommand(ROOT, values, process.env, stderr));
    return 0;
  } catch (error) {
    stderr(`suggest-rules: ${errorMessage(error)}\n`);
    return 1;
  }
}

process.exitCode = await main();
