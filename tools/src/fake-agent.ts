// Test double for SKILLS_AGENT_CMD (evals/runner/fake-agent.sh). No model
// calls. The tests in tools/test/ use it to prove that the runner, the A/B
// verdicts, the gate and the shell wrappers report what really happened.
//
// It acts on EVAL_TASK in its working directory according to FAKE_AGENT_MODE:
//
//   skill-helps  (default) solve the task only when skills are loaded
//   skill-hurts  solve the task only when NO skills are loaded
//   always-pass  always solve the task
//   always-fail  never touch the workdir
//   error        exit 4 like a failed CLI/API session
//
// "Solve" means: replace the workdir with the task's golden fixtures/pass/.
//
// One-shot faults: FAKE_AGENT_ERROR_ONCE=<file> makes the first call (the one
// that creates <file>) an agent error; FAKE_AGENT_FAIL_ONCE=<file> makes it a
// no-change run.
//
// Skill-load reporting (EVAL_SKILLS_LOG, set by the runner) follows
// FAKE_AGENT_LOAD:
//
//   present      (default) log every skill present in the workdir
//   none         create the log but load nothing (model ignores skills)
//   leak         log sw-php-foundation even when no skills are present
//   unsupported  never create the log (adapter cannot report)
//
// Token reporting (EVAL_USAGE_LOG, set by the runner) writes FAKE_AGENT_USAGE,
// an "<input> <output>" line. Default: "1200 200" with skills present,
// "1000 100" without. FAKE_AGENT_USAGE=none writes nothing.
import { appendFileSync, cpSync, existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { envOr } from './env.ts';
import { compareText } from './text.ts';

export interface FakeAgentOptions {
  root: string;
  cwd: string;
  env: NodeJS.ProcessEnv;
  out: (text: string) => void;
  err: (text: string) => void;
}

/** Kept in the workdir when the agent solves the task. */
const KEEP = new Set(['.claude', '.agents', '.transcript.txt']);

const skillsIn = (cwd: string): string[] => {
  const dir = join(cwd, '.claude/skills');
  return existsSync(dir) ? readdirSync(dir).toSorted(compareText) : [];
};

/** The skill-load log. Returns an error text for an unknown mode. */
function logSkills(log: string, mode: string, skills: string[]): string | undefined {
  if (mode === 'present') appendFileSync(log, skills.map((s) => `${s}\n`).join(''));
  else if (mode === 'none') appendFileSync(log, '');
  else if (mode === 'leak') appendFileSync(log, 'sw-php-foundation\n');
  else if (mode !== 'unsupported') return 'fake-agent: unknown FAKE_AGENT_LOAD\n';
  return undefined;
}

function solve(o: FakeAgentOptions, task: string): number {
  const pass = join(o.root, 'evals/tasks', task, 'fixtures/pass');
  if (!existsSync(pass)) {
    o.err(`fake-agent: ${task} has no fixtures/pass\n`);
    return 4;
  }
  for (const entry of readdirSync(o.cwd)) {
    if (!KEEP.has(entry)) rmSync(join(o.cwd, entry), { recursive: true, force: true });
  }
  cpSync(pass, o.cwd, { recursive: true });
  const transcript = join(pass, '.transcript.txt');
  if (existsSync(transcript)) o.out(readFileSync(transcript, 'utf8'));
  o.out(`fake-agent: solved ${task}\n`);
  return 0;
}

/** Creates `marker` and returns true on the first call that names it. */
function firstTime(marker: string): boolean {
  if (marker === '' || existsSync(marker)) return false;
  writeFileSync(marker, '');
  return true;
}

function act(o: FakeAgentOptions, task: string, loaded: boolean): number {
  const noChange = (): number => {
    o.out('fake-agent: no change\n');
    return 0;
  };
  const mode = envOr(o.env, 'FAKE_AGENT_MODE', 'skill-helps');
  if (mode === 'skill-helps') return loaded ? solve(o, task) : noChange();
  if (mode === 'skill-hurts') return loaded ? noChange() : solve(o, task);
  if (mode === 'always-pass') return solve(o, task);
  if (mode === 'always-fail') return noChange();
  if (mode === 'error') {
    o.err('fake-agent: simulated API error\n');
    return 4;
  }
  o.err(`fake-agent: unknown FAKE_AGENT_MODE '${mode}'\n`);
  return 2;
}

/** One agent session. Returns the exit code. */
export function fakeAgent(o: FakeAgentOptions): number {
  const task = envOr(o.env, 'EVAL_TASK', '');
  if (task === '') {
    o.err('fake-agent: EVAL_TASK not set (run through run-task.sh)\n');
    return 1;
  }
  const skills = skillsIn(o.cwd);
  const loaded = skills.length > 0;

  const skillsLog = envOr(o.env, 'EVAL_SKILLS_LOG', '');
  const logError =
    skillsLog === '' ? undefined : logSkills(skillsLog, envOr(o.env, 'FAKE_AGENT_LOAD', 'present'), skills);
  if (logError !== undefined) {
    o.err(logError);
    return 2;
  }
  const usageLog = envOr(o.env, 'EVAL_USAGE_LOG', '');
  const usage = envOr(o.env, 'FAKE_AGENT_USAGE', loaded ? '1200 200' : '1000 100');
  if (usageLog !== '' && usage !== 'none') appendFileSync(usageLog, `${usage}\n`);

  if (firstTime(envOr(o.env, 'FAKE_AGENT_ERROR_ONCE', ''))) {
    o.err('fake-agent: simulated one-off API error\n');
    return 4;
  }
  if (firstTime(envOr(o.env, 'FAKE_AGENT_FAIL_ONCE', ''))) {
    o.out('fake-agent: no change\n');
    return 0;
  }
  return act(o, task, loaded);
}
