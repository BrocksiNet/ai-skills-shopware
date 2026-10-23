// Replay the reference router on real pull requests and report recall and
// noise against the references their review comments map to
// (src/route-replay.ts).
//
//   node tools/bin/replay-routes.ts                       # live: .cache/review-signals, core-reviews
//   node tools/bin/replay-routes.ts --root ../other-checkout --focus sw-testing/references/test-shape-and-flags.md
//   node tools/bin/replay-routes.ts --corpus evals/routing-replay      # offline, the committed corpus
//   node tools/bin/replay-routes.ts --record evals/routing-replay --pr 20734 --pr 19917@1f0c407f74d8
//
// Live mode fetches each PR's files from the GitHub REST API once and caches
// the diff under .cache/pr-diffs/ (git-ignored). `--root` replays another
// checkout's skills and routes on the same signals and diffs. `--record`
// writes trimmed diffs and the comment-mapped references of the chosen PRs
// as corpus cases, keeping hand labels already there; `N@SHA` records the
// diff at the commit a comment was written on. A private review source is
// refused there. Exit 0 = OK, 1 = error, 2 = usage.
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { stderr, stdout } from '../src/cli.ts';
import { errorMessage } from '../src/errors.ts';
import { readCorpus } from '../src/replay-corpus.ts';
import { liveCases, type LiveOptions, liveSetup, recordCases } from '../src/replay-fetch.ts';
import { renderReport } from '../src/replay-report.ts';
import { replayCase, summarize } from '../src/route-replay.ts';

const REPO_ROOT = resolve(import.meta.dirname, '../..');
const USAGE =
  'usage: replay-routes.ts [--root DIR] [--corpus DIR | --signals DIR --source ID] [--diffs DIR]\n' +
  '                        [--focus SKILL/references/FILE.md] [--out FILE] [--record DIR --pr N[@SHA]...]\n';

const OPTIONS = {
  root: { type: 'string' },
  corpus: { type: 'string' },
  signals: { type: 'string' },
  source: { type: 'string' },
  diffs: { type: 'string' },
  focus: { type: 'string' },
  out: { type: 'string' },
  record: { type: 'string' },
  pr: { type: 'string', multiple: true },
} as const;

type Values = ReturnType<typeof parseArgs<{ options: typeof OPTIONS }>>['values'];

function liveOptions(values: Values): LiveOptions {
  return liveSetup(REPO_ROOT, {
    record: values.record !== undefined,
    ...(values.root === undefined ? {} : { root: values.root }),
    ...(values.signals === undefined ? {} : { signals: values.signals }),
    ...(values.source === undefined ? {} : { source: values.source }),
    ...(values.diffs === undefined ? {} : { diffs: values.diffs }),
  });
}

async function run(values: Values): Promise<void> {
  const root = resolve(values.root ?? REPO_ROOT);
  if (values.record !== undefined) {
    const o = liveOptions(values);
    const dirs = await recordCases(resolve(values.record), await liveCases(o), values.pr ?? [], o);
    stdout(dirs.map((d) => `${d}\n`).join(''));
    return;
  }
  const cases = values.corpus === undefined ? await liveCases(liveOptions(values)) : readCorpus(resolve(values.corpus));
  const result = summarize(
    cases.map((c) => replayCase(root, c)),
    values.focus,
  );
  const where =
    values.corpus === undefined ? `${values.source ?? 'core-reviews'} review signals` : 'the recorded corpus';
  const report = renderReport(result, cases[0]?.repo ?? 'shopware/shopware', `Route replay over ${where}`);
  if (values.out === undefined) stdout(report);
  else writeFileSync(values.out, report);
}

async function main(): Promise<number> {
  let values: Values;
  try {
    ({ values } = parseArgs({ options: OPTIONS }));
  } catch (error) {
    stderr(`${errorMessage(error)}\n${USAGE}`);
    return 2;
  }
  if (values.record !== undefined && (values.corpus !== undefined || (values.pr ?? []).length === 0)) {
    stderr(`--record needs --pr and live signals\n${USAGE}`);
    return 2;
  }
  try {
    await run(values);
    return 0;
  } catch (error) {
    stderr(`replay-routes: ${errorMessage(error)}\n`);
    return 1;
  }
}

process.exitCode = await main();
