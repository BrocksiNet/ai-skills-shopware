import { cpSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { contentHash } from './eval-provenance.ts';
import { filesUnder } from './grade/kit.ts';

const inputFiles = (root: string, path: string): string[] => {
  const file = join(root, path);
  const within = relative(root, resolve(file));
  if (within === '..' || within.startsWith('../') || isAbsolute(within))
    throw new Error('experiment inputs must stay within the repository');
  return statSync(file).isDirectory() ? filesUnder(file) : [file];
};

/** Archive exact source inputs and reject any mutation during a prospective suite. */
export function freezeInputs(root: string, destination: string, paths: string[]): () => void {
  const files = paths.flatMap((path) => inputFiles(root, path));
  const hash = contentHash(root, files);
  const archive = join(destination, 'inputs');
  for (const file of files) {
    const target = join(archive, relative(root, file));
    mkdirSync(dirname(target), { recursive: true });
    cpSync(file, target);
  }
  writeFileSync(
    join(destination, 'inputs.json'),
    `${JSON.stringify({ hash, paths, files: files.map((f) => relative(root, f)) }, null, 2)}\n`,
  );
  return () => {
    const now = paths.flatMap((path) => inputFiles(root, path));
    if (contentHash(root, now) !== hash)
      throw new Error('frozen experiment inputs changed; do not continue or pool outcomes');
    if (
      contentHash(
        archive,
        files.map((file) => join(archive, relative(root, file))),
      ) !== hash
    )
      throw new Error('frozen experiment archive changed');
  };
}
