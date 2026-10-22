// Reading files at a ref of a git repository without checking it out, so one
// clone serves every release tag.
import { execFileSync } from 'node:child_process';

const MAX_BUFFER = 1024 * 1024 * 1024;

function git(repo: string, args: string[], input?: string): Buffer {
  return execFileSync('git', ['-C', repo, ...args], {
    maxBuffer: MAX_BUFFER,
    stdio: ['pipe', 'pipe', 'pipe'],
    ...(input === undefined ? {} : { input }),
  });
}

/** The commit SHA a ref points at. */
export function commitOf(repo: string, ref: string): string {
  return git(repo, ['rev-parse', `${ref}^{commit}`])
    .toString()
    .trim();
}

/** Paths under `prefix` at `ref`. */
export function listFiles(repo: string, ref: string, prefix: string): string[] {
  return git(repo, ['ls-tree', '-r', '-z', '--name-only', ref, '--', prefix])
    .toString()
    .split('\0')
    .filter((path) => path !== '');
}

/** Splits `git cat-file --batch` output into one text per requested path. */
export function parseBatch(out: Buffer, paths: string[]): Map<string, string> {
  const files = new Map<string, string>();
  let offset = 0;
  for (const path of paths) {
    const newline = out.indexOf(10, offset);
    if (newline === -1) break;
    const header = out.subarray(offset, newline).toString();
    offset = newline + 1;
    const match = /^\S+ (\S+) (\d+)$/u.exec(header);
    if (match?.[1] === undefined || match[2] === undefined) continue;
    const size = Number(match[2]);
    if (match[1] === 'blob') files.set(path, out.subarray(offset, offset + size).toString());
    offset += size + 1;
  }
  return files;
}

/** The contents of `paths` at `ref`, in one `git cat-file --batch` call.
 *  A path that does not exist at the ref is left out. */
export function readFiles(repo: string, ref: string, paths: string[]): Map<string, string> {
  const out = git(repo, ['cat-file', '--batch'], paths.map((path) => `${ref}:${path}\n`).join(''));
  return parseBatch(out, paths);
}
