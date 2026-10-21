// Trunk mining (plan WP8). `.github/workflows/mine-trunk.yml` runs it weekly.
//
//   node tools/bin/mine-trunk.ts report                      # after docs/.mining-state.json, up to now
//   node tools/bin/mine-trunk.ts report --since 2026-10-13 --until 2026-10-19
//   node tools/bin/mine-trunk.ts advance < issue-body.md     # write the state the report recorded
//
// `report` prints the Markdown issue body. GH_TOKEN or GITHUB_TOKEN raises
// the API rate limit. Exit 0 = OK, 1 = API or state error, 2 = usage.
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { loadCatalog } from '../src/catalog.ts';
import { stderr, stdout } from '../src/cli.ts';
import { errorMessage } from '../src/errors.ts';
import { githubApi } from '../src/github.ts';
import { renderReport, stateFromReport } from '../src/mine-report.ts';
import { mineTrunk, parseState, STATE_PATH, type Window, windowAfter, windowOfDays } from '../src/mine-trunk.ts';
import { readStdin } from '../src/proc.ts';

const ROOT = resolve(import.meta.dirname, '../..');
const USAGE = 'usage: mine-trunk.ts report [--since YYYY-MM-DD --until YYYY-MM-DD] | advance < issue-body.md\n';

function reportWindow(since: string | undefined, until: string | undefined): Window {
  if (since !== undefined && until !== undefined) return windowOfDays(since, until);
  if (since !== undefined || until !== undefined) throw new Error('--since and --until go together');
  const state = parseState(JSON.parse(readFileSync(join(ROOT, STATE_PATH), 'utf8')));
  return windowAfter(state, new Date().toISOString().replace(/\.[0-9]{3}Z$/u, 'Z'));
}

async function main(): Promise<number> {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: { since: { type: 'string' }, until: { type: 'string' } },
  });
  const [command] = positionals;
  if (positionals.length !== 1 || (command !== 'report' && command !== 'advance')) {
    stderr(USAGE);
    return 2;
  }
  try {
    if (command === 'advance') {
      const state = stateFromReport(await readStdin());
      writeFileSync(join(ROOT, STATE_PATH), `${JSON.stringify(state, null, 2)}\n`);
      stdout(`${STATE_PATH}: ${state.last_sha} (${state.last_date})\n`);
      return 0;
    }
    const mined = await mineTrunk(githubApi(process.env), reportWindow(values.since, values.until));
    stdout(renderReport(mined, loadCatalog(ROOT)));
    return 0;
  } catch (error) {
    stderr(`mine-trunk: ${errorMessage(error)}\n`);
    return 1;
  }
}

process.exitCode = await main();
