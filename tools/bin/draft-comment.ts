// The issue side of suggest-rules in CI (.github/workflows/suggest-rules.yml).
//
//   node tools/bin/draft-comment.ts comment suggestions/2026-10-26.md RUN_ID RUN_URL
//       prints the proposals comment for the drift issue
//   COMMENT="/draft 2026-10-26-04" node tools/bin/draft-comment.ts parse
//       prints "<id> <agent>", or the usage on stderr with exit 2
//   gh api repos/R/issues/N/comments --paginate --jq '.[] | {body, login: .user.login}' \
//     | node tools/bin/draft-comment.ts run 2026-10-26-04
//       prints the run whose proposals comment lists the ID; exit 1 if none
import { readFileSync } from 'node:fs';
import { stderr, stdout } from '../src/cli.ts';
import { parseComments, parseDraftCommand, proposalsComment, runFor } from '../src/draft-comment.ts';
import { envOr } from '../src/env.ts';

const USAGE =
  'usage: draft-comment.ts comment FILE RUN_ID RUN_URL | parse (reads $COMMENT) | run ID (reads comments on stdin)\n';

function main(): number {
  const [command, ...args] = process.argv.slice(2);
  if (command === 'comment' && args.length === 3) {
    const [file = '', runId = '', runUrl = ''] = args;
    stdout(proposalsComment({ markdown: readFileSync(file, 'utf8'), runId, runUrl }));
    return 0;
  }
  if (command === 'parse' && args.length === 0) {
    const c = parseDraftCommand(envOr(process.env, 'COMMENT', ''));
    if (typeof c === 'string') return (stderr(`${c}\n`), 2);
    stdout(`${c.id} ${c.agent}\n`);
    return 0;
  }
  if (command === 'run' && args.length === 1) {
    const run = runFor(args[0] ?? '', parseComments(readFileSync(0, 'utf8')));
    if (run === undefined) return (stderr(`no proposals comment lists ${args[0] ?? ''}\n`), 1);
    stdout(`${run}\n`);
    return 0;
  }
  stderr(USAGE);
  return 2;
}

process.exitCode = main();
