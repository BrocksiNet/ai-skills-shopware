import assert from 'node:assert/strict';
import {
  chmodSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  readlinkSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, test } from 'node:test';
import { parseClaude, parseCopilot, parseOpencode, skillName } from '../src/agent-events.ts';
import { copilotActivation, copilotTask, skillDirGrants } from '../src/agents-copilot.ts';
import { type Adapter, claudeActivation, claudeTask, opencodeActivation, opencodeTask } from '../src/agents.ts';
import { onPath, run, tail } from '../src/proc.ts';
import { skillsProfile } from '../src/skills-profile.ts';

const ROOT = resolve(import.meta.dirname, '../..');
const FIXTURES = join(import.meta.dirname, 'fixtures/agents');
const recorded = (name: string): string => readFileSync(join(FIXTURES, name), 'utf8');
const tmp = mkdtempSync(join(tmpdir(), 'agents-test-'));

describe('recorded OpenCode session', () => {
  const s = parseOpencode(recorded('opencode-task.jsonl'));
  test('text, tool calls and the loaded skill', () => {
    assert.deepEqual(s.texts, ['DONE']);
    assert.equal(s.tools, 2);
    assert.deepEqual(s.skills, ['sw-testing']);
    assert.deepEqual(s.errors, []);
  });
  test('tokens summed over steps, cache in input, reasoning in output', () => {
    assert.deepEqual(s.usage, { input: 3817 + 896 + 6011 + 896, output: 18 + 40 + 49 + 210 });
  });
});

describe('recorded Claude Code session', () => {
  const s = parseClaude(recorded('claude-task.jsonl'));
  test('text, loaded skill and the result', () => {
    assert.ok(s.texts.length > 0);
    assert.deepEqual(s.skills, ['sw-testing']);
    assert.equal(s.result?.subtype, 'success');
    assert.equal(s.result.isError, false);
  });
  test('input tokens include cache reads and writes', () => {
    assert.deepEqual(s.result?.usage, { input: 8 + 80616 + 14662, output: 626 });
  });
});

describe('recorded Copilot CLI session', () => {
  const s = parseCopilot(recorded('copilot-task.jsonl'));
  test('text, tool calls, the loaded skill and the result', () => {
    assert.equal(s.texts.length, 4);
    assert.equal(s.tools, 13);
    // The session also called the skill tool for sw-does-not-exist, which
    // failed with "Skill not found": that loaded nothing.
    assert.deepEqual(s.skills, ['sw-extension-review']);
    assert.deepEqual([s.errors, s.exitCode, s.premiumRequests], [[], 0, 0.33]);
  });
  test('tokens from the last usage checkpoint; input already holds the cache', () => {
    assert.deepEqual(s.usage, { input: 51875, output: 1464 });
  });
  test('an error event, a missing result, a later checkpoint wins', () => {
    const t = parseCopilot(
      [
        'not json',
        '{"type":"session.usage_checkpoint","data":{"providerModelMetrics":[{"metrics":{"usage":{"inputTokens":1,"outputTokens":2}}}]}}',
        '{"type":"session.usage_checkpoint","data":{"providerModelMetrics":[{"metrics":{"usage":{"inputTokens":5,"outputTokens":6}}},{"metrics":{"usage":{"inputTokens":"10","outputTokens":1}}}]}}',
        '{"type":"session.usage_checkpoint","data":{"providerModelMetrics":[]}}',
        '{"type":"session.error","data":{"message":"Rate limit exceeded"}}',
        '{"type":"assistant.message","data":{"content":"  "}}',
      ].join('\n'),
    );
    assert.deepEqual(
      [t.events, t.usage, t.errors, t.exitCode, t.texts],
      [5, { input: 15, output: 7 }, ['Rate limit exceeded'], null, []],
    );
  });
});

const claudeSkillUse = (id: string, skill: string): string =>
  JSON.stringify({
    type: 'assistant',
    message: { content: [{ type: 'tool_use', id, name: 'Skill', input: { skill } }] },
  });
const claudeToolResult = (id: string, isError: boolean): string =>
  JSON.stringify({
    type: 'user',
    message: { content: [{ type: 'tool_result', tool_use_id: id, is_error: isError, content: 'x' }] },
  });

describe('event parsing edge cases', () => {
  test('skips lines that are not JSON objects', () => {
    const s = parseOpencode('progress...\n[1]\n"x"\n{"type":"text","part":{"text":"hi"}}\n');
    assert.deepEqual([s.events, s.texts], [1, ['hi']]);
  });
  test('blank text, duplicate skills, empty token objects, error without message', () => {
    const s = parseOpencode(
      [
        '{"type":"text","part":{"text":"  "}}',
        '{"type":"tool_use","part":{"tool":"skill","state":{"input":{"name":"a"}}}}',
        '{"type":"tool_use","part":{"tool":"skill","state":{"input":{"id":"a"}}}}',
        '{"type":"step_finish","part":{"tokens":{}}}',
        '{"type":"error","error":{"type":"RateLimit"}}',
      ].join('\n'),
    );
    assert.deepEqual([s.texts, s.skills, s.usage, s.errors, s.tools], [[], ['a'], null, ['RateLimit'], 2]);
  });
  test('skill names drop a leading slash and a plugin prefix', () => {
    assert.equal(skillName({ command: '/plug:sw-testing ' }, ['skill', 'command']), 'sw-testing');
    assert.equal(skillName({ skill: '', command: 'x' }, ['skill', 'command']), 'x');
    assert.equal(skillName(null, ['skill']), '');
  });
  test('a failed OpenCode skill call loaded nothing', () => {
    // A skill-off run where the model guessed a skill name: OpenCode reports
    // the call with status "error". It is not a leak into the baseline.
    const s = parseOpencode(
      [
        '{"type":"tool_use","part":{"tool":"skill","state":{"status":"error","input":{"name":"sw-plugin-development"},"error":"Skill not found"}}}',
        '{"type":"tool_use","part":{"tool":"skill","state":{"status":"completed","input":{"name":"sw-testing"}}}}',
      ].join('\n'),
    );
    assert.deepEqual([s.skills, s.tools], [['sw-testing'], 2]);
  });
  test('a failed Claude Skill call loaded nothing', () => {
    const s = parseClaude(
      [
        claudeSkillUse('t1', 'sw-plugin-development'),
        claudeToolResult('t1', true),
        claudeSkillUse('t2', 'sw-testing'),
        claudeToolResult('t2', false),
        claudeSkillUse('t3', 'sw-plugin-development'),
      ].join('\n'),
    );
    // t3 has no result (the session was cut off): the call still counts.
    assert.deepEqual(s.skills, ['sw-testing', 'sw-plugin-development']);
  });
  test('a Claude session without a result', () => {
    const s = parseClaude('{"type":"assistant","message":{"content":[{"type":"text","text":"A"}]}}\n');
    assert.deepEqual([s.texts, s.result], [['A'], null]);
  });
  test('an empty Claude usage object reports no tokens', () => {
    assert.equal(parseClaude('{"type":"result","subtype":"success","usage":{}}').result?.usage, null);
  });
});

describe('process helpers', () => {
  test('tail keeps the last lines', () => {
    assert.equal(tail('1\n2\n3\n4\n5\n6\n', 5), '2\n3\n4\n5\n6\n');
    assert.equal(tail('a', 5), 'a');
    assert.equal(tail('', 5), '');
  });
  test('onPath', () => {
    assert.equal(onPath('bash', process.env), true);
    assert.equal(onPath('no-such-cli-here', process.env), false);
  });
  test('a timeout stops the whole process group', async () => {
    const r = await run('bash', ['-c', '(sleep 20 &); sleep 20'], { env: process.env, timeoutSeconds: 1 });
    assert.deepEqual([r.timedOut, r.status], [true, 143]);
  });
  test('a missing command is status 127', async () => {
    assert.equal((await run('no-such-cli-here', [], { env: process.env })).status, 127);
  });
});

// Fake CLIs: replay FAKE_OUT, write FAKE_ERR to stderr, exit FAKE_RC, and
// record stdin, arguments, HOME, config and the visible skills.
const bin = join(tmp, 'bin');
mkdirSync(bin);
for (const name of ['opencode', 'claude', 'copilot']) {
  const file = join(bin, name);
  writeFileSync(
    file,
    `#!/usr/bin/env bash
[ -n "\${FAKE_REC:-}" ] && { cat > "$FAKE_REC.stdin"; printf '%s\\n' "$@" > "$FAKE_REC.args"; printf 'HOME=%s\\nCFG=%s\\nCOPILOT_HOME=%s\\n' "$HOME" "\${OPENCODE_CONFIG_CONTENT:-}" "\${COPILOT_HOME:-}" > "$FAKE_REC.env"; ls "$PWD/.agents/skills" "$PWD/.claude/skills" 2>/dev/null | head -n 3 >> "$FAKE_REC.env"; }
[ -n "\${FAKE_ERR:-}" ] && printf '%b' "$FAKE_ERR" >&2
[ -n "\${FAKE_SLEEP:-}" ] && sleep "$FAKE_SLEEP"
[ -n "\${FAKE_OUT:-}" ] && cat "$FAKE_OUT"
exit "\${FAKE_RC:-0}"
`,
  );
  chmodSync(file, 0o755);
}
const fixture = (name: string, text: string): string => {
  const file = join(tmp, name);
  writeFileSync(file, text);
  return file;
};
const withResult = (patch: object): string =>
  recorded('claude-task.jsonl')
    .split('\n')
    .filter((l) => l !== '')
    .map((l) => {
      const ev: unknown = JSON.parse(l);
      const isResult = typeof ev === 'object' && ev !== null && 'type' in ev && ev.type === 'result';
      return JSON.stringify(isResult ? { ...ev, ...patch } : ev);
    })
    .join('\n');

interface Call {
  rc: number;
  out: string;
  err: string;
  skills: string | null;
  usage: string | null;
  args: string | null;
  stdin: string | null;
  env: string | null;
}

let n = 0;
async function call(adapter: Adapter, over: NodeJS.ProcessEnv): Promise<Call> {
  const dir = join(tmp, `call-${++n}`);
  mkdirSync(dir);
  const env: NodeJS.ProcessEnv = {
    PATH: `${bin}:${process.env.PATH}`,
    TMPDIR: tmp,
    EVAL_SKILLS_LOG: join(dir, 'skills'),
    EVAL_USAGE_LOG: join(dir, 'usage'),
    FAKE_REC: join(dir, 'rec'),
    ...over,
  };
  let out = '';
  let err = '';
  const io = {
    out: (t: string): void => {
      out += t;
    },
    err: (t: string): void => {
      err += t;
    },
  };
  const rc = await adapter('do it', env, io, ROOT);
  const read = (f: string): string | null => (existsSync(join(dir, f)) ? readFileSync(join(dir, f), 'utf8') : null);
  return {
    rc,
    out,
    err,
    skills: read('skills'),
    usage: read('usage'),
    args: read('rec.args'),
    stdin: read('rec.stdin'),
    env: read('rec.env'),
  };
}

describe('opencode-task adapter', () => {
  test('a finished session prints the text and logs skills and tokens', async () => {
    const r = await call(opencodeTask, { FAKE_OUT: join(FIXTURES, 'opencode-task.jsonl') });
    assert.deepEqual([r.rc, r.out, r.skills, r.usage], [0, 'DONE\n', 'sw-testing\n', '11620 317\n']);
  });
  test('runs isolated with the step cap and no web search, the prompt as an argument', async () => {
    const r = await call(opencodeTask, {
      FAKE_OUT: join(FIXTURES, 'opencode-task.jsonl'),
      TASK_MAX_TURNS: '3',
      TASK_MODEL: 'p/m',
    });
    assert.match(r.env ?? '', /HOME=.*opencode-task\.[^/]+\/home\n/u);
    assert.match(
      r.env ?? '',
      /CFG=\{"agent":\{"build":\{"steps":3\}\},"permission":\{"question":"deny"\},"tools":\{"websearch":false\}\}/u,
    );
    assert.equal(r.args, 'run\n--standalone\n--auto\n--format\njson\n-m\np/m\ndo it\n');
  });
  test('an auth file is copied into the throwaway HOME', async () => {
    const r = await call(opencodeTask, {
      FAKE_OUT: join(FIXTURES, 'opencode-task.jsonl'),
      OPENCODE_AUTH_FILE: '/nonexistent',
    });
    assert.deepEqual([r.rc, r.err], [4, 'OPENCODE_AUTH_FILE not found: /nonexistent\n']);
  });
  test('error event, empty session and a crash are agent errors', async () => {
    const error = await call(opencodeTask, {
      FAKE_OUT: fixture('oc-error.jsonl', '{"type":"error","error":{"message":"Model unavailable"}}\n'),
    });
    assert.deepEqual([error.rc, error.err], [4, 'opencode-task: Model unavailable\n']);
    const empty = await call(opencodeTask, { FAKE_OUT: fixture('oc-empty.jsonl', '{"type":"step_start"}\n') });
    assert.deepEqual([empty.rc, empty.err], [4, 'opencode-task: session produced no text and no tool call\n']);
    const crash = await call(opencodeTask, {
      FAKE_OUT: join(FIXTURES, 'opencode-task.jsonl'),
      FAKE_RC: '3',
      FAKE_ERR: '1\\n2\\n3\\n4\\n5\\n6\\n',
    });
    assert.deepEqual([crash.rc, crash.err], [4, 'opencode-task: opencode exited 3\n2\n3\n4\n5\n6\n']);
  });
  test('a hung session times out promptly', async () => {
    const started = Date.now();
    const r = await call(opencodeTask, { FAKE_SLEEP: '20', TASK_TIMEOUT_SECONDS: '1' });
    assert.equal(r.rc, 4);
    assert.match(r.err, /timed out after 1s/u);
    assert.ok(Date.now() - started < 10_000);
  });
  test('bad settings and a missing CLI are agent errors', async () => {
    assert.equal((await call(opencodeTask, { TASK_MAX_TURNS: '0' })).err, 'TASK_MAX_TURNS must be >= 1\n');
    assert.equal((await call(opencodeTask, { TASK_TIMEOUT_SECONDS: 'x' })).rc, 4);
    assert.deepEqual(Object.values(await call(opencodeTask, { PATH: '/usr/bin:/bin' })).slice(0, 3), [
      4,
      '',
      'opencode CLI not found\n',
    ]);
  });
});

describe('claude-task adapter', () => {
  test('a finished session prints the text and logs skills and tokens', async () => {
    const r = await call(claudeTask, { FAKE_OUT: join(FIXTURES, 'claude-task.jsonl') });
    assert.equal(r.rc, 0);
    assert.ok(r.out.endsWith('\n'));
    assert.deepEqual([r.skills, r.usage, r.stdin], ['sw-testing\n', '95286 626\n', 'do it']);
    assert.match(
      r.args ?? '',
      /^-p\n--setting-sources\nproject\n--model\nsonnet\n--max-turns\n12\n--max-budget-usd\n0\.75\n/u,
    );
  });
  test('a turn or budget cap is a finished attempt, even when claude exits 1', async () => {
    const r = await call(claudeTask, {
      FAKE_OUT: fixture('cl-turns.jsonl', withResult({ subtype: 'error_max_turns', is_error: true })),
      FAKE_RC: '1',
    });
    assert.deepEqual([r.rc, r.err], [0, 'claude-task: stopped at error_max_turns\n']);
  });
  test('a failed result, a missing result and a crash are agent errors', async () => {
    const failed = await call(claudeTask, {
      FAKE_OUT: fixture(
        'cl-err.jsonl',
        withResult({ subtype: 'error_during_execution', is_error: true, result: 'API Error: 529' }),
      ),
    });
    assert.deepEqual([failed.rc, failed.err], [4, 'claude-task: API Error: 529\n']);
    const none = await call(claudeTask, {
      FAKE_OUT: fixture(
        'cl-none.jsonl',
        '{"type":"assistant","message":{"content":[{"type":"text","text":"DONE"}]}}\n',
      ),
    });
    assert.deepEqual([none.rc, none.out, none.err], [4, 'DONE\n', 'claude-task: session ended without a result\n']);
    const crash = await call(claudeTask, {
      FAKE_OUT: join(FIXTURES, 'claude-task.jsonl'),
      FAKE_RC: '2',
      FAKE_ERR: 'boom\\n',
    });
    assert.deepEqual([crash.rc, crash.err], [4, 'boom\n']);
  });
});

describe('skillDirGrants', () => {
  test('grants the real folder of every linked skill, and nothing without links', () => {
    const base = mkdtempSync(join(tmpdir(), 'grants.'));
    try {
      const skill = join(base, 'repo/skills/sw-a');
      mkdirSync(skill, { recursive: true });
      const work = join(base, 'work');
      for (const sub of ['.agents/skills', '.claude/skills']) {
        mkdirSync(join(work, sub), { recursive: true });
        symlinkSync(skill, join(work, sub, 'sw-a'));
      }
      symlinkSync(join(base, 'gone'), join(work, '.agents/skills/sw-gone'));
      assert.deepEqual(skillDirGrants(work), ['--add-dir', realpathSync(skill)]);
      assert.deepEqual(skillDirGrants(join(base, 'repo')), []);
    } finally {
      rmSync(base, { recursive: true, force: true });
    }
  });
});

describe('copilot-task adapter', () => {
  const token = { COPILOT_GITHUB_TOKEN: 't' };
  test('a finished session prints the text and logs skills and tokens', async () => {
    const r = await call(copilotTask, { ...token, FAKE_OUT: join(FIXTURES, 'copilot-task.jsonl') });
    assert.deepEqual([r.rc, r.skills, r.usage], [0, 'sw-extension-review\n', '51875 1464\n']);
    assert.ok(r.out.startsWith('Now let me check'));
  });
  test('runs isolated, headless, without web or GitHub MCP, the prompt as an argument', async () => {
    const r = await call(copilotTask, { ...token, FAKE_OUT: join(FIXTURES, 'copilot-task.jsonl'), TASK_MODEL: 'm' });
    assert.match(r.env ?? '', /HOME=.*copilot-task\.[^/]+\/home\n/u);
    assert.match(r.env ?? '', /COPILOT_HOME=.*copilot-task\.[^/]+\/home\/\.copilot\n/u);
    assert.equal(
      r.args,
      [
        '-p',
        'do it',
        '--model',
        'm',
        '--output-format',
        'json',
        '--no-ask-user',
        '--no-auto-update',
        '--disable-builtin-mcps',
        '--disable-client-telemetry',
        '--secret-env-vars',
        'COPILOT_GITHUB_TOKEN,GH_TOKEN,GITHUB_TOKEN',
        '--allow-all-tools',
        '--excluded-tools',
        'web_fetch',
        'fetch_copilot_cli_documentation',
        '',
      ].join('\n'),
    );
  });
  test('read-only mode offers only the skill tool and read tools', async () => {
    const r = await call(copilotTask, {
      GH_TOKEN: 't',
      FAKE_OUT: join(FIXTURES, 'copilot-task.jsonl'),
      COPILOT_TASK_READ_ONLY: '1',
    });
    assert.match(r.args ?? '', /--available-tools\nskill\nview\nglob\ngrep\n--allow-tool\nskill\nview\nglob\ngrep\n$/u);
    assert.doesNotMatch(r.args ?? '', /--allow-all-tools/u);
  });
  test('no token, an error event, a missing result and a crash are agent errors', async () => {
    const none = await call(copilotTask, { FAKE_OUT: join(FIXTURES, 'copilot-task.jsonl') });
    assert.equal(none.rc, 4);
    assert.match(none.err, /^copilot-task: COPILOT_GITHUB_TOKEN not set/u);
    assert.equal(none.args, null);
    const error = await call(copilotTask, {
      ...token,
      FAKE_OUT: fixture('cp-error.jsonl', '{"type":"session.error","data":{"message":"Rate limit exceeded"}}\n'),
    });
    assert.deepEqual([error.rc, error.err], [4, 'copilot-task: Rate limit exceeded\n']);
    const gone = await call(copilotTask, {
      ...token,
      FAKE_OUT: fixture('cp-gone.jsonl', ''),
      FAKE_RC: '1',
      FAKE_ERR: 'Error: Model "x" from --model flag is not available.\\n',
    });
    assert.deepEqual(
      [gone.rc, gone.err],
      [4, 'copilot-task: session ended without a result\nError: Model "x" from --model flag is not available.\n'],
    );
    const failed = await call(copilotTask, {
      ...token,
      FAKE_OUT: fixture('cp-exit.jsonl', '{"type":"result","exitCode":2}\n'),
    });
    assert.deepEqual([failed.rc, failed.err], [4, 'copilot-task: session exit code 2\n']);
    const empty = await call(copilotTask, {
      ...token,
      FAKE_OUT: fixture('cp-empty.jsonl', '{"type":"result","exitCode":0}\n'),
    });
    assert.deepEqual([empty.rc, empty.err], [4, 'copilot-task: session produced no text and no tool call\n']);
  });
  test('a hung session times out; a missing CLI is an agent error', async () => {
    const r = await call(copilotTask, { ...token, FAKE_SLEEP: '20', TASK_TIMEOUT_SECONDS: '1' });
    assert.deepEqual([r.rc, r.err], [4, 'copilot-task: timed out after 1s\n']);
    assert.deepEqual((await call(copilotTask, { ...token, PATH: '/usr/bin:/bin' })).err, 'copilot CLI not found\n');
  });
});

describe('activation adapters', () => {
  test('opencode lists the loaded skills from an isolated workspace', async () => {
    const r = await call(opencodeActivation, { FAKE_OUT: join(FIXTURES, 'opencode-task.jsonl') });
    assert.deepEqual([r.rc, r.out], [0, 'sw-testing\n']);
    assert.match(r.env ?? '', /"permission":\{"edit":"deny","bash":"deny"/u);
    assert.match(r.env ?? '', /\.agents\/skills:\nsw-admin-js\n/u);
  });
  test('opencode: an error or no events fails the run, never "no activation"', async () => {
    const error = await call(opencodeActivation, {
      FAKE_OUT: fixture('a-err.jsonl', '{"type":"error","error":{"message":"down"}}\n'),
    });
    assert.deepEqual([error.rc, error.out, error.err], [1, '', 'Activation session failed: down\n']);
    const none = await call(opencodeActivation, { FAKE_OUT: fixture('a-none.jsonl', '') });
    assert.deepEqual([none.rc, none.err], [1, 'Activation session produced no events; no score recorded.\n']);
  });
  test('claude lists the loaded skills; a failed or missing result fails', async () => {
    const ok = await call(claudeActivation, { FAKE_OUT: join(FIXTURES, 'claude-task.jsonl') });
    assert.deepEqual([ok.rc, ok.out], [0, 'sw-testing\n']);
    assert.match(ok.args ?? '', /--tools\nSkill\nRead\nGlob\nGrep\n/u);
    const failed = await call(claudeActivation, {
      FAKE_OUT: fixture('a-cl-err.jsonl', withResult({ subtype: 'error_max_turns', is_error: true, result: '' })),
    });
    assert.deepEqual([failed.rc, failed.err], [1, 'Activation session failed: error_max_turns\n']);
  });
  test('copilot lists the loaded skills with read-only tools; a missing result fails', async () => {
    const ok = await call(copilotActivation, {
      COPILOT_GITHUB_TOKEN: 't',
      FAKE_OUT: join(FIXTURES, 'copilot-task.jsonl'),
    });
    assert.deepEqual([ok.rc, ok.out], [0, 'sw-extension-review\n']);
    assert.match(ok.args ?? '', /--available-tools\nskill\nview\nglob\ngrep\n/u);
    assert.match(ok.env ?? '', /\.agents\/skills:\nsw-admin-js\n/u);
    const none = await call(copilotActivation, { COPILOT_GITHUB_TOKEN: 't', FAKE_OUT: fixture('a-cp.jsonl', '') });
    assert.deepEqual([none.rc, none.err], [1, 'Activation session ended without a result; no score recorded.\n']);
    assert.equal((await call(copilotActivation, {})).rc, 2);
  });
  test('a CLI exit code passes through when the stream was fine', async () => {
    assert.equal((await call(claudeActivation, { FAKE_OUT: join(FIXTURES, 'claude-task.jsonl'), FAKE_RC: '5' })).rc, 5);
  });
});

const wd = (): string => mkdtempSync(join(tmp, 'wd-'));

describe('skills profile', () => {
  test('a task skills file selects its skills in both folders', () => {
    const dir = wd();
    assert.equal(skillsProfile(ROOT, 'on', dir, 'dal-search-without-limit'), null);
    const linked = readdirSync(join(dir, '.claude/skills'));
    assert.equal(linked.length, 2);
    assert.deepEqual(readdirSync(join(dir, '.agents/skills')), linked);
    const [first = ''] = linked;
    assert.equal(readlinkSync(join(dir, '.claude/skills', first)), join(ROOT, 'skills', first));
  });
  test('no skills file, or no task, links every skill', () => {
    const all = readdirSync(join(ROOT, 'skills')).filter((s) =>
      lstatSync(join(ROOT, 'skills', s)).isDirectory(),
    ).length;
    const dir = wd();
    skillsProfile(ROOT, 'on', dir, 'no-empty-explicit');
    assert.equal(readdirSync(join(dir, '.claude/skills')).length, all);
    const bare = wd();
    skillsProfile(ROOT, 'on', bare, '');
    assert.equal(readdirSync(join(bare, '.agents/skills')).length, all);
  });
  test('off removes both folders; a bad mode is an error', () => {
    const dir = wd();
    skillsProfile(ROOT, 'on', dir, 'dal-search-without-limit');
    assert.equal(skillsProfile(ROOT, 'off', dir, ''), null);
    assert.deepEqual(
      [existsSync(join(dir, '.claude/skills')), existsSync(join(dir, '.agents/skills'))],
      [false, false],
    );
    assert.equal(skillsProfile(ROOT, 'sideways', dir, ''), 'skills-profile: mode must be on|off');
  });
});
