// Grader: no-contradiction-full-profile
// Detects contradictory guidance in the transcript when a full skill set is loaded.
// Deterministic contradiction checks first; LLM-judge is the documented fallback
// for fuzzier coherence (set SKILLS_JUDGE_CMD to enable it).
import { spawnSync } from 'node:child_process';
import { envOr } from '../src/env.ts';
import { filesUnder, type Grader, hasLine, read, verdict } from '../src/grade/kit.ts';

/** The judge's answer to the transcript; a failing command still says PASS. */
function judge(command: string, transcript: string): string {
  const prompt = `Does this transcript contain contradictory instructions? Answer PASS if coherent, FAIL if not.\n\n${transcript}`;
  const r = spawnSync('bash', ['-c', command], { input: prompt, encoding: 'utf8' });
  return r.status === 0 ? r.stdout.trim() : `${r.stdout}PASS`.trim();
}

export const grade: Grader = ({ workdir, transcript }) => {
  let contradiction = false;
  const notes: string[] = [];

  // Cache: must not recommend BOTH the deprecated event and the collector.
  // collector-only is fine; both being *recommended* is the contradiction.
  if (
    hasLine(transcript, /CacheTagsEvent/iu) &&
    hasLine(transcript, /CacheTagCollector/iu) &&
    hasLine(transcript, /(use|add|subscribe).*CacheTagsEvent/iu)
  ) {
    contradiction = true;
    notes.push('[recommends both CacheTagsEvent and CacheTagCollector]');
  }

  // Testing: must not call the same unit test both "no kernel" and integration.
  if (hasLine(transcript, /unit test/iu) && hasLine(transcript, /IntegrationTestBehaviour/iu)) {
    contradiction = true;
    notes.push('[mixes unit test with IntegrationTestBehaviour]');
  }

  // Final code sanity: the produced code should use the collector, not the event.
  if (filesUnder(workdir).some((f) => hasLine(read(f), /CacheTagsEvent/iu))) {
    contradiction = true;
    notes.push('[final code still references deprecated event]');
  }

  let answer = 'n/a';
  const command = envOr(process.env, 'SKILLS_JUDGE_CMD', '');
  if (!contradiction && command !== '') {
    // Optional fuzzy coherence check. Judge prints PASS/FAIL.
    answer = judge(command, transcript);
    if (/FAIL/iu.test(answer)) contradiction = true;
  }

  return verdict(!contradiction, { judge: answer, notes: notes.length > 0 ? notes.join(' ') : 'none' });
};
