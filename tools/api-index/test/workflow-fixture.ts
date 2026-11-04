import assert from 'node:assert/strict';
import { execFileSync, spawnSync, type SpawnSyncReturns } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { isNode, type Node } from '../src/node.ts';
const root = resolve(import.meta.dirname, '../../..');
export function write(dir: string, file: string, content: string): void {
  const path = join(dir, file);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
}
export function git(repo: string, ...args: string[]): string {
  return execFileSync(
    'git',
    [
      '-C',
      repo,
      '-c',
      'user.name=Quality Fixture',
      '-c',
      'user.email=quality@example.invalid',
      '-c',
      'commit.gpgsign=false',
      '-c',
      'core.hooksPath=/dev/null',
      ...args,
    ],
    { env: { ...process.env, GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null' }, encoding: 'utf8' },
  ).trim();
}
export function commit(repo: string): void {
  git(repo, 'add', 'src');
  git(repo, 'commit', '-qm', 'fixture');
}
export function cliResult(bin: string, args: string[], input?: string): SpawnSyncReturns<string> {
  return spawnSync(process.execPath, [join(root, 'tools/api-index/bin', `${bin}.ts`), ...args], {
    cwd: root,
    env: process.env,
    encoding: 'utf8',
    timeout: 20000,
    input,
  });
}
export function cli(bin: string, args: string[], expected = 0): string {
  const result = cliResult(bin, args);
  assert.equal(result.error, undefined, result.error?.message);
  assert.equal(result.status, expected, result.stderr + result.stdout);
  return result.stdout;
}
export function objectJson(text: string): Node {
  const value: unknown = JSON.parse(text);
  assert.ok(isNode(value));
  return value;
}

/** A local source history, with no host Shopware runtime or network. */
export function fixtureRepo(dir: string, revisions: { tag: string; files: Record<string, string> }[]): string {
  const repo = join(dir, 'repo');
  mkdirSync(repo, { recursive: true });
  git(repo, 'init', '-q', '--initial-branch=main');
  for (const revision of revisions) {
    for (const [file, content] of Object.entries(revision.files)) write(repo, file, content);
    commit(repo);
    git(repo, 'tag', revision.tag);
  }
  return repo;
}
