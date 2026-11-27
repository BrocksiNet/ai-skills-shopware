import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { absoluteLinks, changelogSection, releaseNotes, unwrap } from '../src/release-notes.ts';

const changelog = `# Changelog

## [Unreleased]

## [0.2.0] - 2026-11-27

A short summary that is
wrapped over two lines.

### Added

- **Worktrees.** One place for
  worktrees, with
  predictable names.
- Second item, see [the docs](docs/a.md).

\`\`\`bash
keep
  this as it is
\`\`\`

| a | b |
| - | - |

## [0.1.0] - 2026-11-01

### Fixed

- Old.

[0.2.0]: https://github.com/o/r/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/o/r/releases/tag/v0.1.0
`;

describe('release-notes', () => {
  test('finds a section with or without the v prefix and stops at the next one', () => {
    const section = changelogSection(changelog, 'v0.2.0');
    assert.equal(section?.startsWith('A short summary'), true);
    assert.equal(section.endsWith('| - | - |'), true);
    assert.equal(changelogSection(changelog, '0.1.0'), '### Fixed\n\n- Old.');
    assert.equal(changelogSection(changelog, '9.9.9'), undefined);
  });

  test('joins wrapped paragraphs and list items, keeps code and tables', () => {
    assert.equal(
      releaseNotes(changelog, '0.2.0'),
      [
        'A short summary that is wrapped over two lines.',
        '',
        '### Added',
        '',
        '- **Worktrees.** One place for worktrees, with predictable names.',
        '- Second item, see [the docs](https://github.com/o/r/blob/v0.2.0/docs/a.md).',
        '',
        '```bash',
        'keep',
        '  this as it is',
        '```',
        '',
        '| a | b |',
        '| - | - |',
        '',
      ].join('\n'),
    );
  });

  test('only repo-relative links become absolute', () => {
    assert.equal(
      absoluteLinks('[a](./x.md) [b](https://y.test) [c](#z) [d](mailto:m@x.test)', 'https://r.test/blob/v1.0.0'),
      '[a](https://r.test/blob/v1.0.0/x.md) [b](https://y.test) [c](#z) [d](mailto:m@x.test)',
    );
  });

  test('a heading is never joined with the line after it', () => {
    assert.equal(unwrap('### Fixed\n- one\n  two'), '### Fixed\n- one two');
  });
});
