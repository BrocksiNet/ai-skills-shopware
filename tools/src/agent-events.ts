// Parsers for the JSON event streams of the agent CLIs the eval adapters
// drive (plan WP10 step 3; replaces the inline Python in
// evals/runner/*-task.sh and *-activation.sh).
//
//   OpenCode:    `opencode run --format json`, one event per line
//   Claude Code: `claude -p --output-format stream-json --verbose`
//
// Recorded sessions for the tests live in tools/test/fixtures/agents/.
// Lines that are not JSON objects are skipped: CLIs print progress and
// warnings in between, and one bad line must not hide the rest.

type Json = Record<string, unknown>;

const isObject = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v);
const obj = (v: unknown): Json => (isObject(v) ? v : {});
const str = (v: unknown): string => (typeof v === 'string' ? v : '');
/** Python's `int(x or 0)` for token counts: numbers and numeric strings. */
const count = (v: unknown): number => {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : 0;
  return Number.isFinite(n) ? Math.trunc(n) : 0;
};

export function jsonLines(text: string): Json[] {
  const out: Json[] = [];
  for (const line of text.split('\n')) {
    if (line.trim() === '') continue;
    try {
      const value: unknown = JSON.parse(line);
      if (isObject(value)) out.push(value);
    } catch {
      // not JSON: progress output, skip
    }
  }
  return out;
}

/** A skill name from a skill tool call: `/plugin:skill` and `skill` both give `skill`. */
export function skillName(input: unknown, keys: readonly string[]): string {
  const args = obj(input);
  let raw = '';
  for (const k of keys) {
    const v = args[k];
    if (typeof v === 'string' && v !== '') {
      raw = v;
      break;
    }
  }
  return (raw.replace(/^\/+/u, '').split(':').at(-1) ?? '').trim();
}

const addOnce = (list: string[], name: string): void => {
  if (name !== '' && !list.includes(name)) list.push(name);
};

export interface Usage {
  /** Input tokens including cache reads and writes. */
  input: number;
  /** Output tokens including reasoning. */
  output: number;
}

export interface OpencodeSession {
  texts: string[];
  /** Tool calls of any kind. */
  tools: number;
  /** Skills loaded, in first-load order. */
  skills: string[];
  /** Summed over steps; null when no step reported tokens. */
  usage: Usage | null;
  errors: string[];
  /** JSON object lines seen. */
  events: number;
}

export function parseOpencode(text: string): OpencodeSession {
  const s: OpencodeSession = { texts: [], tools: 0, skills: [], usage: null, errors: [], events: 0 };
  for (const ev of jsonLines(text)) {
    s.events++;
    const part = obj(ev.part);
    switch (ev.type) {
      case 'text': {
        const t = str(part.text);
        if (t.trim() !== '') s.texts.push(t);
        break;
      }
      case 'tool_use': {
        s.tools++;
        const state = obj(part.state);
        // A failed call, such as a skill name that is not installed, loaded
        // nothing. Counting it made skill-off runs look like a leak.
        if (part.tool === 'skill' && state.status !== 'error')
          addOnce(s.skills, skillName(state.input, ['id', 'name', 'skill']));
        break;
      }
      case 'step_finish': {
        const tok = obj(part.tokens);
        if (Object.keys(tok).length === 0) break;
        const cache = obj(tok.cache);
        s.usage ??= { input: 0, output: 0 };
        s.usage.input += count(tok.input) + count(cache.read) + count(cache.write);
        s.usage.output += count(tok.output) + count(tok.reasoning);
        break;
      }
      case 'error': {
        const err = obj(ev.error);
        s.errors.push(str(err.message) || str(err.type) || 'unknown error');
        break;
      }
    }
  }
  return s;
}

export interface ClaudeResult {
  subtype: string;
  isError: boolean;
  /** The result text, or the error message on failure. */
  message: string;
  usage: Usage | null;
}

export interface ClaudeSession {
  texts: string[];
  skills: string[];
  /** The final `result` event; null when the session ended without one. */
  result: ClaudeResult | null;
}

export function parseClaude(text: string): ClaudeSession {
  const s: ClaudeSession = { texts: [], skills: [], result: null };
  // Skill calls by tool_use id, and the ids whose tool_result is an error
  // (for example "Unknown skill"): those loaded nothing.
  const calls: { id: string; name: string }[] = [];
  const failed = new Set<string>();
  for (const msg of jsonLines(text)) {
    if (msg.type === 'user') {
      const content = obj(msg.message).content;
      for (const block of Array.isArray(content) ? content : []) {
        const b = obj(block);
        if (b.type === 'tool_result' && b.is_error === true) failed.add(str(b.tool_use_id));
      }
      continue;
    }
    if (msg.type === 'result') {
      const u = obj(msg.usage);
      s.result = {
        subtype: str(msg.subtype),
        isError: Boolean(msg.is_error),
        message: str(msg.result),
        usage:
          Object.keys(u).length === 0
            ? null
            : {
                input: count(u.input_tokens) + count(u.cache_read_input_tokens) + count(u.cache_creation_input_tokens),
                output: count(u.output_tokens),
              },
      };
    }
    if (msg.type !== 'assistant') continue;
    const content = obj(msg.message).content;
    for (const block of Array.isArray(content) ? content : []) {
      const b = obj(block);
      if (b.type === 'text' && str(b.text).trim() !== '') s.texts.push(str(b.text));
      if (b.type === 'tool_use' && b.name === 'Skill')
        calls.push({ id: str(b.id), name: skillName(b.input, ['skill', 'command']) });
    }
  }
  for (const call of calls) if (call.id === '' || !failed.has(call.id)) addOnce(s.skills, call.name);
  return s;
}

/** Hitting the turn or budget cap is a finished attempt, graded as usual. */
export const CLAUDE_CAPS = ['error_max_turns', 'error_max_budget_usd'];
