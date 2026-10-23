// The changed files of a unified diff, for the reference routing.
/** One file of a unified diff. */
export interface ChangedFile {
  path: string;
  /** Added and removed lines, without the +/- marker. */
  lines: string[];
}

/** The changed files of a unified diff. A renamed or moved file is listed
 *  under both paths, the old one without lines: a test moved out of
 *  `tests/integration/` concerns the rules for both suites. `---` and `+++`
 *  count as headers only before the first hunk of a file, so a removed SQL
 *  comment (`-- x`) is a line, not a header. */
export function parseDiff(diff: string): ChangedFile[] {
  const files: ChangedFile[] = [];
  let current: ChangedFile | null = null;
  let oldPath = '';
  let inHunk = false;
  const add = (path: string): ChangedFile => {
    const found = files.find((f) => f.path === path);
    if (found !== undefined) return found;
    const file = { path, lines: [] };
    files.push(file);
    return file;
  };
  for (const line of diff.split('\n')) {
    if (line.startsWith('diff --git ')) {
      [current, oldPath, inHunk] = [null, '', false];
    } else if (!inHunk && line.startsWith('rename from ')) {
      oldPath = line.slice('rename from '.length).trim();
    } else if (!inHunk && line.startsWith('rename to ')) {
      add(oldPath);
      current = add(line.slice('rename to '.length).trim());
    } else if (!inHunk && line.startsWith('--- ')) {
      const path = line.slice(4).replace(/^a\//u, '').trim();
      if (path !== '/dev/null') oldPath = path;
    } else if (!inHunk && line.startsWith('+++ ')) {
      const path = line.slice(4).replace(/^b\//u, '').trim();
      if (path !== '/dev/null' && oldPath !== '' && path !== oldPath) add(oldPath);
      current = add(path === '/dev/null' ? oldPath : path);
    } else if (line.startsWith('@@')) {
      inHunk = true;
    } else if (current !== null && inHunk && (line.startsWith('+') || line.startsWith('-'))) {
      current.lines.push(line.slice(1));
    }
  }
  return files;
}
