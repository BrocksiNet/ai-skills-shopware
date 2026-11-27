// Prints the release notes for one version from CHANGELOG.md, with the hard
// wraps joined so GitHub does not break lines mid-sentence. See
// docs/maintaining/releasing.md#cutting-a-release.
//
//   node tools/bin/release-notes.ts v0.20.0 > /tmp/notes.md
//   gh release create v0.20.0 --target <sha> --notes-file /tmp/notes.md
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { stderr, stdout } from '../src/cli.ts';
import { releaseNotes } from '../src/release-notes.ts';

function main(): number {
  const version = process.argv[2];
  if (version === undefined || version === '') {
    stderr('usage: node tools/bin/release-notes.ts <version>\n');
    return 2;
  }
  const changelog = readFileSync(resolve(import.meta.dirname, '../../CHANGELOG.md'), 'utf8');
  const notes = releaseNotes(changelog, version);
  if (notes === undefined) {
    stderr(`CHANGELOG.md has no section for ${version}\n`);
    return 1;
  }
  stdout(notes);
  return 0;
}

process.exitCode = main();
