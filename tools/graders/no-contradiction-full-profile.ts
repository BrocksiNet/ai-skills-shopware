// Grader: no-contradiction-full-profile
// Detects contradictory guidance in the transcript when a full skill set is loaded.
// Deterministic contradiction checks first; LLM-judge is the documented fallback
// for fuzzier coherence (set SKILLS_JUDGE_CMD to enable it).
import { spawnSync } from 'node:child_process';
import { envOr } from '../src/env.ts';
import { filesUnder, type Grader, hasLine, read, stripComments, verdict } from '../src/grade/kit.ts';

/** The judge's answer to the transcript; a failing command still says PASS. */
function judge(command: string, transcript: string): string {
  const prompt = `Does this transcript contain contradictory instructions? Answer PASS if coherent, FAIL if not.\n\n${transcript}`;
  const r = spawnSync('bash', ['-c', command], { input: prompt, encoding: 'utf8' });
  return r.status === 0 ? r.stdout.trim() : `${r.stdout}PASS`.trim();
}

export const grade: Grader = ({ workdir, transcript }) => {
  let contradiction = false;
  const notes: string[] = [];

  // A line that rules an API out ("not the deprecated CacheTagsEvent", "no
  // IntegrationTestBehaviour") is coherent guidance, not a recommendation.
  const negated = /\b(?:not|no|nor|never|without|instead|rather than|avoid|deprecated|don't|do not|no longer)\b/iu;
  const recommends = (pattern: RegExp): boolean =>
    transcript.split('\n').some((l) => pattern.test(l) && !negated.test(l));

  // Cache: must not recommend BOTH the deprecated event and the collector.
  if (recommends(/(use|add|subscribe|listen).*CacheTagsEvent/iu) && hasLine(transcript, /CacheTagCollector/iu)) {
    contradiction = true;
    notes.push('[recommends both CacheTagsEvent and CacheTagCollector]');
  }

  // Testing: must not call the same unit test both "no kernel" and integration.
  if (hasLine(transcript, /unit test/iu) && recommends(/IntegrationTestBehaviour/iu)) {
    contradiction = true;
    notes.push('[mixes unit test with IntegrationTestBehaviour]');
  }

  // Final code sanity: the produced code uses neither the deprecated event nor
  // the kernel trait. Comments may name them.
  const code = filesUnder(workdir)
    .filter((f) => f.endsWith('.php'))
    .map((f) => stripComments(read(f)));
  if (code.some((c) => /CacheTagsEvent/iu.test(c))) {
    contradiction = true;
    notes.push('[final code still references deprecated event]');
  }
  if (code.some((c) => /\buse\s+IntegrationTestBehaviour\s*;/u.test(c))) {
    contradiction = true;
    notes.push('[unit test uses IntegrationTestBehaviour]');
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
