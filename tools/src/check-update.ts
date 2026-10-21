// Report whether a newer release of this skills repo is available, and print
// the command to update (scripts/check-update.sh).
//
// The pinned version comes from, in order: SKILLS_PINNED_VERSION, a
// `.skills-version` file in the current directory, one in the repo root.
// Without any of them the copy counts as unpinned. The latest release tag
// comes from the GitHub API; GH_TOKEN or GITHUB_TOKEN is sent when set.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { envOr } from './env.ts';
import { errorMessage } from './errors.ts';

export const REPO = 'BrocksiNet/ai-skills-shopware';
const PIN_FILE = '.skills-version';

export interface CheckUpdateOptions {
  root: string;
  cwd: string;
  env: NodeJS.ProcessEnv;
  out: (text: string) => void;
  /** The latest release tag; throws or returns '' when unknown. */
  latest: () => Promise<string>;
}

/** The pin with spaces and newlines removed, like `tr -d ' \n'`. */
export function pinnedVersion(o: Pick<CheckUpdateOptions, 'root' | 'cwd' | 'env'>): string {
  const fromEnv = envOr(o.env, 'SKILLS_PINNED_VERSION', '');
  if (fromEnv !== '') return fromEnv;
  const file = [join(o.cwd, PIN_FILE), join(o.root, PIN_FILE)].find((f) => existsSync(f));
  return file === undefined ? '' : readFileSync(file, 'utf8').replaceAll(/[ \n]/gu, '');
}

const isRelease = (value: unknown): value is { tag_name: string } =>
  typeof value === 'object' && value !== null && 'tag_name' in value && typeof value.tag_name === 'string';

/** The latest release tag from the GitHub API. */
export async function latestRelease(env: NodeJS.ProcessEnv): Promise<string> {
  const token = envOr(env, 'GH_TOKEN', envOr(env, 'GITHUB_TOKEN', ''));
  const headers: Record<string, string> = { accept: 'application/vnd.github+json' };
  if (token !== '') headers.authorization = `Bearer ${token}`;
  const response = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, { headers });
  if (!response.ok) throw new Error(`GitHub API: HTTP ${response.status}`);
  const body: unknown = await response.json();
  if (!isRelease(body)) throw new Error('GitHub API: no tag_name in the latest release');
  return body.tag_name;
}

function advice(pinned: string, latest: string): string[] {
  if (pinned === '') {
    return [
      'No local pin found. To update to the latest skills, run:',
      '    npx skills update',
      `To pin for reproducibility, install with @${latest} and record it:`,
      `    echo '${latest}' > ${PIN_FILE}`,
    ];
  }
  if (pinned === latest) return [`You are up to date (${pinned}).`];
  return [
    `An update is available: ${pinned} -> ${latest}`,
    'Run:',
    '    npx skills update',
    `    echo '${latest}' > ${PIN_FILE}   # update your pin`,
  ];
}

/** Exit 0 = reported, 1 = the latest tag is unknown. */
export async function checkUpdate(o: CheckUpdateOptions): Promise<number> {
  const pinned = pinnedVersion(o);
  let latest = '';
  let reason = '';
  try {
    latest = await o.latest();
  } catch (error) {
    reason = ` (${errorMessage(error)})`;
  }
  if (latest === '') {
    o.out(`Could not determine the latest release tag for ${REPO}${reason}.\n`);
    o.out(`Check your network or GH_TOKEN, or browse https://github.com/${REPO}/releases\n`);
    return 1;
  }
  const lines = [
    `Repository : ${REPO}`,
    `Latest tag : ${latest}`,
    `Pinned     : ${pinned === '' ? '<unpinned>' : pinned}`,
    '',
    ...advice(pinned, latest),
  ];
  o.out(`${lines.join('\n')}\n`);
  return 0;
}
