// Compare two A/B result files (baseline vs new) by task.
// scripts/eval-diff.sh is a wrapper for this file.
//
//   node tools/bin/eval-diff.ts <old.jsonl> <new.jsonl>
//
// Prints Markdown: tasks whose verdict or skill-on pass rate changed, added
// and removed tasks, and skill-on tokens per run when both files have them.
// Exit 0 always on valid input (a report, not a gate); 2 on a usage error.
import { readFileSync } from 'node:fs';
import { errorMessage } from '../src/errors.ts';
import { diff } from '../src/eval-diff.ts';
import { parseResults } from '../src/eval-results.ts';

function main(): number {
  const [oldFile, newFile, ...rest] = process.argv.slice(2);
  if (oldFile === undefined || newFile === undefined || rest.length > 0) {
    console.error('usage: eval-diff.ts <old.jsonl> <new.jsonl>');
    return 2;
  }
  try {
    console.log(diff(parseResults(readFileSync(oldFile, 'utf8')), parseResults(readFileSync(newFile, 'utf8'))));
    return 0;
  } catch (error) {
    console.error(`eval-diff: ${errorMessage(error)}`);
    return 2;
  }
}

process.exitCode = main();
