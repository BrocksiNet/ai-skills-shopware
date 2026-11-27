// Shell scripts an agent writes instead of running them (sw-worktrees tasks).

/** The commands of a shell script: `\` continuations joined, `#` comment
 *  lines and blank lines dropped, `&&` / `;` chains split into commands. */
export function shellCommands(text: string): string[] {
  return text
    .replaceAll(/\\\r?\n/gu, ' ')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l !== '' && !l.startsWith('#'))
    .flatMap((l) => l.split(/\s*(?:&&|;)\s*/u))
    .map((c) => c.replace(/\s+#.*$/u, '').trim())
    .filter((c) => c !== '');
}

/** The path a `git [-C <dir>] worktree add|move ...` command creates, quotes
 *  removed: the first argument after the subcommand and its options (the
 *  second for `move`). Undefined for any other command. */
export function worktreeTarget(command: string): string | undefined {
  const words = (command.match(/"[^"]*"|'[^']*'|\S+/gu) ?? []).map((w) => w.replaceAll(/^["']|["']$/gu, ''));
  const at = words.findIndex((w, i) => w === 'worktree' && words[0] === 'git' && i > 0);
  const sub = words[at + 1];
  if (at < 0 || (sub !== 'add' && sub !== 'move')) return undefined;
  const args: string[] = [];
  for (let i = at + 2; i < words.length; i += 1) {
    const w = words[i] ?? '';
    if (w === '-b' || w === '-B' || w === '--reason') i += 1;
    else if (!w.startsWith('-')) args.push(w);
  }
  return sub === 'add' ? args[0] : args[1];
}
