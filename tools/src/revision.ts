import { spawnSync } from 'node:child_process';

export function shortSha(root: string): string {
  const r = spawnSync('git', ['-C', root, 'rev-parse', '--short', 'HEAD'], { encoding: 'utf8' });
  return r.status === 0 ? r.stdout.trim() : 'unknown';
}
