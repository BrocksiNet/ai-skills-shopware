// Review tasks hand the agent a `fixture/diff.patch`. A hunk header whose
// counts do not match its body makes the patch corrupt for `git apply` and
// lets a reviewer flag the malformed diff instead of the planted problem.
// Like git, an empty line counts as blank context (editors and agents strip
// the single space).
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { test } from 'node:test';

const ROOT = resolve(import.meta.dirname, '../..');
const TASKS = join(ROOT, 'evals/tasks');
const HUNK = /^@@ -\d+(?:,(\d+))? \+\d+(?:,(\d+))? @@/u;

/** Problems in one patch: hunks whose header counts disagree with the body. */
function hunkProblems(patch: string): string[] {
  const lines = patch.replace(/\n$/u, '').split('\n');
  const problems: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const header = HUNK.exec(lines[i] ?? '');
    if (header === null) continue;
    let oldLeft = Number(header[1] ?? '1');
    let newLeft = Number(header[2] ?? '1');
    let j = i + 1;
    while (j < lines.length && (oldLeft > 0 || newLeft > 0)) {
      const line = lines[j] ?? '';
      j++;
      if (line.startsWith('\\')) continue;
      if (line.startsWith('-')) oldLeft--;
      else if (line.startsWith('+')) newLeft--;
      else if (line.startsWith(' ') || line === '') {
        oldLeft--;
        newLeft--;
      } else {
        problems.push(`line ${j}: ${JSON.stringify(line.slice(0, 40))} inside the hunk at line ${i + 1}`);
        break;
      }
    }
    const next = lines[j] ?? '';
    if (oldLeft !== 0 || newLeft !== 0) problems.push(`hunk at line ${i + 1}: header counts do not match`);
    else if (next !== '' && !next.startsWith('@@') && !next.startsWith('diff ') && !next.startsWith('\\'))
      problems.push(`hunk at line ${i + 1}: body runs past the header counts into line ${j + 1}`);
    i = j - 1;
  }
  return problems;
}

test('hunkProblems accepts a well-formed patch and flags wrong header counts', () => {
  const good = '--- a/x\n+++ b/x\n@@ -1,3 +1,4 @@\n a\n \n+b\n c\ndiff --git a/y b/y\n';
  assert.deepEqual(hunkProblems(good), []);
  assert.deepEqual(hunkProblems(good.replace('\n \n', '\n\n')), []);
  assert.notDeepEqual(hunkProblems(good.replace('+1,4', '+1,5')), []);
  assert.notDeepEqual(hunkProblems(good.replace('+1,4', '+1,3')), []);
});

test('every review fixture diff.patch has hunk headers that match their bodies', () => {
  const broken = readdirSync(TASKS).flatMap((task) => {
    const file = join(TASKS, task, 'fixture/diff.patch');
    if (!existsSync(file)) return [];
    return hunkProblems(readFileSync(file, 'utf8')).map((problem) => `${task}: ${problem}`);
  });
  assert.deepEqual(broken, []);
});
