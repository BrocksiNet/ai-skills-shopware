import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { COPILOT_DEFAULT_MODEL } from '../src/agents-copilot.ts';
import { OPENCODE_FREE_MODEL } from '../src/agents.ts';
import { evalProfiles, evalProfilesFromEnv } from '../src/eval-profiles.ts';

describe('eval profiles', () => {
  test('one profile per agent with its default model, duplicates dropped', () => {
    assert.deepEqual(evalProfiles(' opencode, copilot ,opencode', ''), [
      { id: 'opencode', agent: 'opencode', model: OPENCODE_FREE_MODEL },
      { id: 'copilot', agent: 'copilot', model: COPILOT_DEFAULT_MODEL },
    ]);
  });
  test('no agent means the free OpenCode model', () => {
    assert.deepEqual(evalProfilesFromEnv({}), [{ id: 'opencode', agent: 'opencode', model: OPENCODE_FREE_MODEL }]);
    assert.deepEqual(evalProfiles(',', ''), evalProfiles('opencode', ''));
  });
  test('a model applies to a single agent only', () => {
    assert.deepEqual(evalProfilesFromEnv({ EVAL_AGENTS: 'claude', EVAL_MODEL: 'haiku' }), [
      { id: 'claude', agent: 'claude', model: 'haiku' },
    ]);
    assert.equal(evalProfiles('opencode,copilot', 'x'), 'a model can only be set for a single agent');
  });
  test('an unknown agent is an error', () => {
    assert.equal(evalProfiles('opencode,codex', ''), 'unknown agent(s): codex (known: opencode, copilot, claude)');
  });
});
