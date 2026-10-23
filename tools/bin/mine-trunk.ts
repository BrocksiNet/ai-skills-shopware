// Drift mining (plan WP8, WP12). `.github/workflows/mine-trunk.yml` runs it
// weekly over every source in rules/sources.json.
//
//   node tools/bin/mine-trunk.ts report                      # after docs/.mining-state.json, up to now
//   node tools/bin/mine-trunk.ts report --since 2026-10-13 --until 2026-10-19
//   node tools/bin/mine-trunk.ts report --source shopware    # one source only
//   node tools/bin/mine-trunk.ts report --signals out.jsonl  # also write the mapped signals
//   node tools/bin/mine-trunk.ts report --reviews DIR        # add the week's review comments from a review-signals store
//   node tools/bin/mine-trunk.ts run --repo OWNER/NAME [--out FILE] [--run-url URL]  # report, then open or update the issue
//   node tools/bin/mine-trunk.ts run --dry-run [--repo OWNER/NAME]                    # report and issue plan, nothing written
//   node tools/bin/mine-trunk.ts advance [--comment '/mined shopware'] < issue-body.md  # write the states the report recorded
//
// `report` prints the Markdown issue body. A source without a state gets a
// first pass that only records its branch head. `run` takes the same
// options as `report`; it never writes the state file, only `advance` does.
// `--dry-run` prints the report and what `run` would do to the issues.
// `advance` moves every source of the report, or the ones the `/mined`
// comment names, and never moves a state back. GH_TOKEN or GITHUB_TOKEN
// raises the API rate limit; `run` needs one to write.
// Exit 0 = OK, 1 = API or state error, 2 = usage.
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { stderr, stdout } from '../src/cli.ts';
import { errorMessage } from '../src/errors.ts';
import { githubApi, githubWrite } from '../src/github.ts';
import { run } from '../src/mine-issue.ts';
import { advance, minedSources, report } from '../src/mine-run.ts';
import { STATE_PATH } from '../src/mine-trunk.ts';
import { readStdin } from '../src/proc.ts';

const ROOT = resolve(import.meta.dirname, '../..');
const USAGE =
  'usage: mine-trunk.ts report|run [--since YYYY-MM-DD --until YYYY-MM-DD] [--source ID] [--signals FILE]' +
  ' [--reviews DIR] [run: --repo OWNER/NAME --out FILE --run-url URL --dry-run]' +
  " | advance [--comment '/mined [ID...]'] < issue-body.md\n";
const COMMANDS = new Set(['report', 'run', 'advance']);

const OPTIONS = {
  since: { type: 'string' },
  until: { type: 'string' },
  source: { type: 'string' },
  signals: { type: 'string' },
  reviews: { type: 'string' },
  repo: { type: 'string' },
  out: { type: 'string' },
  'run-url': { type: 'string' },
  'dry-run': { type: 'boolean' },
  comment: { type: 'string' },
} as const;

type Values = ReturnType<typeof parseArgs<{ allowPositionals: true; options: typeof OPTIONS }>>['values'];

/** Runs one command; returns what it prints. */
async function execute(command: string, values: Values): Promise<string> {
  const { repo, out, comment, 'run-url': runUrl, 'dry-run': dryRun, ...mining } = values;
  if (command === 'advance') {
    const only = comment === undefined ? undefined : minedSources(comment);
    const states = advance(ROOT, await readStdin(), only);
    return Object.entries(states)
      .map(([id, s]) => `${STATE_PATH}: ${id} ${s.last_sha} (${s.last_date})\n`)
      .join('');
  }
  const api = githubApi(process.env);
  if (command === 'report') return report({ root: ROOT, api, ...mining });
  const write = dryRun === true ? undefined : githubWrite(process.env);
  return run({
    root: ROOT,
    api,
    ...mining,
    ...(repo === undefined ? {} : { repo }),
    ...(write === undefined ? {} : { write }),
    ...(out === undefined ? {} : { out }),
    ...(runUrl === undefined ? {} : { runUrl }),
    dryRun: dryRun === true,
  });
}

async function main(): Promise<number> {
  const { positionals, values } = parseArgs({ allowPositionals: true, options: OPTIONS });
  const [command = ''] = positionals;
  if (positionals.length !== 1 || !COMMANDS.has(command)) {
    stderr(USAGE);
    return 2;
  }
  try {
    stdout(await execute(command, values));
    return 0;
  } catch (error) {
    stderr(`mine-trunk: ${errorMessage(error)}\n`);
    return 1;
  }
}

process.exitCode = await main();
