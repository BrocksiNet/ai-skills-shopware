// Review collector (plan WP12 step 3). `.github/workflows/collect-reviews.yml`
// runs it daily with --public into the `review-signals` release assets.
//
//   node tools/bin/collect-reviews.ts                            # every review source since the cache's cursor
//   node tools/bin/collect-reviews.ts --source core-reviews --since 2026-09-01 --until 2026-10-20
//   node tools/bin/collect-reviews.ts --public --dir "$RUNNER_TEMP/review-signals"
//
// The store defaults to .cache/review-signals/ (git-ignored). Private review
// sources are only collected there, never in CI. GraphQL needs GH_TOKEN or
// GITHUB_TOKEN; locally the token of `gh auth login` is used when neither is
// set. Exit 0 = OK, 1 = API or store error, 2 = usage.
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { stderr, stdout } from '../src/cli.ts';
import { collect, summary } from '../src/collect-run.ts';
import { envInt, envOr } from '../src/env.ts';
import { errorMessage } from '../src/errors.ts';
import { githubGraphql, githubToken } from '../src/github.ts';
import { CACHE_DIR, KEEP_MONTHS } from '../src/review-store.ts';

const ROOT = resolve(import.meta.dirname, '../..');
const USAGE =
  'usage: collect-reviews.ts [--source ID]... [--public] [--since YYYY-MM-DD] [--until YYYY-MM-DD] [--dir DIR]\n';

function token(): string {
  const fromEnv = githubToken(process.env);
  if (fromEnv !== '') return fromEnv;
  try {
    return execFileSync('gh', ['auth', 'token'], { encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
}

async function main(): Promise<number> {
  let values;
  try {
    ({ values } = parseArgs({
      options: {
        source: { type: 'string', multiple: true },
        public: { type: 'boolean' },
        since: { type: 'string' },
        until: { type: 'string' },
        dir: { type: 'string' },
      },
    }));
  } catch (error) {
    stderr(`${errorMessage(error)}\n${USAGE}`);
    return 2;
  }
  try {
    const result = await collect({
      root: ROOT,
      gql: githubGraphql(token()),
      dir: resolve(values.dir ?? resolve(ROOT, CACHE_DIR)),
      ...(values.source === undefined ? {} : { sources: values.source }),
      publicOnly: values.public === true,
      ...(values.since === undefined ? {} : { since: values.since }),
      ...(values.until === undefined ? {} : { until: values.until }),
      keepMonths: envInt(process.env, 'REVIEW_KEEP_MONTHS', KEEP_MONTHS, 1),
      now: new Date().toISOString().replace(/\.[0-9]{3}Z$/u, 'Z'),
      ci: envOr(process.env, 'GITHUB_ACTIONS', '') === 'true',
    });
    stdout(summary(result));
    return 0;
  } catch (error) {
    stderr(`collect-reviews: ${errorMessage(error)}\n`);
    return 1;
  }
}

process.exitCode = await main();
