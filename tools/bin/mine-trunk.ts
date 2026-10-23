// Drift mining (plan WP8, WP12). `.github/workflows/mine-trunk.yml` runs it
// weekly over every source in rules/sources.json.
//
//   node tools/bin/mine-trunk.ts report                      # after docs/.mining-state.json, up to now
//   node tools/bin/mine-trunk.ts report --since 2026-10-13 --until 2026-10-19
//   node tools/bin/mine-trunk.ts report --source shopware    # one source only
//   node tools/bin/mine-trunk.ts report --signals out.jsonl  # also write the mapped signals
//   node tools/bin/mine-trunk.ts report --reviews DIR        # add the week's review comments from a review-signals store
//   node tools/bin/mine-trunk.ts advance < issue-body.md     # write the states the report recorded
//
// `report` prints the Markdown issue body. A source without a state gets a
// first pass that only records its branch head. GH_TOKEN or GITHUB_TOKEN
// raises the API rate limit. Exit 0 = OK, 1 = API or state error, 2 = usage.
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { stderr, stdout } from '../src/cli.ts';
import { errorMessage } from '../src/errors.ts';
import { githubApi } from '../src/github.ts';
import { advance, report } from '../src/mine-run.ts';
import { STATE_PATH } from '../src/mine-trunk.ts';
import { readStdin } from '../src/proc.ts';

const ROOT = resolve(import.meta.dirname, '../..');
const USAGE =
  'usage: mine-trunk.ts report [--since YYYY-MM-DD --until YYYY-MM-DD] [--source ID] [--signals FILE]' +
  ' [--reviews DIR] | advance < issue-body.md\n';

async function main(): Promise<number> {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: {
      since: { type: 'string' },
      until: { type: 'string' },
      source: { type: 'string' },
      signals: { type: 'string' },
      reviews: { type: 'string' },
    },
  });
  const [command] = positionals;
  if (positionals.length !== 1 || (command !== 'report' && command !== 'advance')) {
    stderr(USAGE);
    return 2;
  }
  try {
    if (command === 'advance') {
      const states = advance(ROOT, await readStdin());
      for (const [id, s] of Object.entries(states)) stdout(`${STATE_PATH}: ${id} ${s.last_sha} (${s.last_date})\n`);
      return 0;
    }
    stdout(await report({ root: ROOT, api: githubApi(process.env), ...values }));
    return 0;
  } catch (error) {
    stderr(`mine-trunk: ${errorMessage(error)}\n`);
    return 1;
  }
}

process.exitCode = await main();
