// How much of an agent session's context our skills take. Reads Claude Code
// transcripts (one JSON object per line) and counts three things:
//
// - the skill listing: our lines in the `skill_listing` attachment, sent on
//   every request of the session;
// - skill bodies: the message Claude Code adds when a skill is invoked
//   ("Base directory for this skill: ...");
// - files of our skills the agent read with Read or a shell command
//   (references, a SKILL.md, the router script output).
//
// A body or a file stays in context until the next compaction, so its cost
// is its size times the requests that follow it. Sizes are characters / 4,
// an estimate, not a tokenizer count.

type Json = Record<string, unknown>;

const isRecord = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v);
const str = (v: unknown): string => (typeof v === 'string' ? v : '');
const num = (v: unknown): number => (typeof v === 'number' ? v : 0);

/** Estimated tokens for a text length. */
export const tokens = (chars: number): number => Math.round(chars / 4);

export type LoadKind = 'skill' | 'reference' | 'skill-file' | 'router';

export interface Load {
  /** Index of the transcript line that brought it in. */
  line: number;
  kind: LoadKind;
  skill: string;
  tokens: number;
  /** Requests that carried it, up to the next compaction. */
  requests: number;
}

export interface ContextReport {
  requests: number;
  /** Input tokens over all requests: uncached + cache read + cache write. */
  inputTokens: number;
  cacheReadTokens: number;
  /** The largest single request. */
  peakTokens: number;
  /** Our lines in the skill listing, per request. */
  listingTokens: number;
  /** All lines in the skill listing, per request. */
  listingAllTokens: number;
  loads: Load[];
}

/** Decides whether a skill is ours. `path` is the skill folder or a file in
 *  it when the transcript names one. */
export type IsOurs = (skill: string, path?: string) => boolean;

const SKILL_BODY = /^Base directory for this skill: (\S+)/u;
const SKILL_IN_PATH = /\/skills\/([a-z][a-z0-9-]*)\//u;
const SHELL_READ = /\b(?:cat|sed|head|tail|less|node)\b/u;

/** The skill a file belongs to and what kind of file it is, or null when
 *  the path is not inside a `skills/<name>/` folder. */
export function classifyPath(path: string): { skill: string; kind: LoadKind } | null {
  const match = SKILL_IN_PATH.exec(path);
  if (match === null) return null;
  const skill = match[1] ?? '';
  if (/\/scripts\/route\.mjs/u.test(path)) return { skill, kind: 'router' };
  if (/\/references\//u.test(path)) return { skill, kind: 'reference' };
  return { skill, kind: 'skill-file' };
}

/** The file a tool call reads, or null. Shell commands count when they
 *  print or run something inside a skills folder. */
function readPath(tool: Json): string | null {
  const input = isRecord(tool.input) ? tool.input : {};
  if (tool.name === 'Read') return str(input.file_path) || null;
  if (tool.name === 'Bash') {
    const command = str(input.command);
    if (!SHELL_READ.test(command)) return null;
    return /\S*\/skills\/[a-z][a-z0-9-]*\/\S*/u.exec(command)?.[0] ?? null;
  }
  return null;
}

function contentParts(message: unknown): Json[] {
  if (!isRecord(message)) return [];
  const { content } = message;
  if (typeof content === 'string') return [{ type: 'text', text: content }];
  return Array.isArray(content) ? content.filter((part) => isRecord(part)) : [];
}

function listingTokens(content: string, isOurs: IsOurs): number {
  let chars = 0;
  for (const line of content.split('\n')) {
    const name = /^- ([\w:-]+):/u.exec(line)?.[1];
    if (name !== undefined && isOurs(name)) chars += line.length;
  }
  return tokens(chars);
}

interface Walk {
  report: ContextReport;
  isOurs: IsOurs;
  requestLines: number[];
  compactions: number[];
  seen: Set<string>;
  toolUses: Map<string, Json>;
}

function onAttachment(walk: Walk, attachment: Json): void {
  if (attachment.type !== 'skill_listing' || walk.report.listingAllTokens !== 0) return;
  const content = str(attachment.content);
  walk.report.listingAllTokens = tokens(content.length);
  walk.report.listingTokens = listingTokens(content, walk.isOurs);
}

function onAssistant(walk: Walk, entry: Json, message: Json, line: number): void {
  const { report } = walk;
  const usage = isRecord(message.usage) ? message.usage : null;
  const id = str(message.id) || str(entry.requestId) || `line-${line}`;
  if (usage !== null && !walk.seen.has(id)) {
    walk.seen.add(id);
    walk.requestLines.push(line);
    const read = num(usage.cache_read_input_tokens);
    const total = num(usage.input_tokens) + read + num(usage.cache_creation_input_tokens);
    report.inputTokens += total;
    report.cacheReadTokens += read;
    report.peakTokens = Math.max(report.peakTokens, total);
  }
  for (const part of contentParts(message)) {
    if (part.type === 'tool_use') walk.toolUses.set(str(part.id), part);
  }
}

function loadFromPart(walk: Walk, part: Json, line: number): Load | null {
  if (part.type === 'text') {
    const text = str(part.text);
    const base = SKILL_BODY.exec(text)?.[1];
    if (base === undefined) return null;
    const skill = base.split('/').at(-1) ?? '';
    return walk.isOurs(skill, base) ? { line, kind: 'skill', skill, tokens: tokens(text.length), requests: 0 } : null;
  }
  if (part.type !== 'tool_result') return null;
  const tool = walk.toolUses.get(str(part.tool_use_id));
  const path = tool === undefined ? null : readPath(tool);
  const file = path === null ? null : classifyPath(path);
  if (path === null || file === null || !walk.isOurs(file.skill, path)) return null;
  const size = JSON.stringify(part.content ?? '').length;
  return { line, kind: file.kind, skill: file.skill, tokens: tokens(size), requests: 0 };
}

function onEntry(walk: Walk, entry: unknown, line: number): void {
  if (!isRecord(entry)) return;
  if (entry.type === 'system' && entry.subtype === 'compact_boundary') walk.compactions.push(line);
  if (entry.type === 'attachment' && isRecord(entry.attachment)) onAttachment(walk, entry.attachment);
  if (entry.type === 'assistant' && isRecord(entry.message)) onAssistant(walk, entry, entry.message, line);
  if (entry.type !== 'user') return;
  for (const part of contentParts(entry.message)) {
    const load = loadFromPart(walk, part, line);
    if (load !== null) walk.report.loads.push(load);
  }
}

/** Measures one transcript, given its parsed lines. */
export function analyzeTranscript(lines: readonly unknown[], isOurs: IsOurs): ContextReport {
  const walk: Walk = {
    report: {
      requests: 0,
      inputTokens: 0,
      cacheReadTokens: 0,
      peakTokens: 0,
      listingTokens: 0,
      listingAllTokens: 0,
      loads: [],
    },
    isOurs,
    requestLines: [],
    compactions: [],
    seen: new Set(),
    toolUses: new Map(),
  };
  lines.forEach((entry, line) => {
    onEntry(walk, entry, line);
  });
  const { report, requestLines, compactions } = walk;
  report.requests = requestLines.length;
  for (const load of report.loads) {
    const end = compactions.find((c) => c > load.line) ?? Number.POSITIVE_INFINITY;
    load.requests = requestLines.filter((r) => r > load.line && r < end).length;
  }
  return report;
}

/** Tokens our skills put into the requests of one transcript: the listing
 *  on every request plus each load for every request that carried it. */
export function skillTokens(report: ContextReport): { listing: number; loads: number } {
  return {
    listing: report.listingTokens * report.requests,
    loads: report.loads.reduce((sum, l) => sum + l.tokens * l.requests, 0),
  };
}

/** Parses JSONL text, skipping lines that are not JSON. */
export function parseJsonl(text: string): unknown[] {
  const out: unknown[] = [];
  for (const line of text.split('\n')) {
    if (line.trim() === '') continue;
    try {
      out.push(JSON.parse(line));
    } catch {
      // A truncated last line of a live session; skip it.
    }
  }
  return out;
}

/** The ownership test for a skills library: current names always count;
 *  an old name counts when the skill folder resolves into the library, or
 *  when no path is known and the name is not a core skill. */
export function ownershipTest(
  current: ReadonlySet<string>,
  aliases: ReadonlySet<string>,
  opts: {
    resolve: (path: string) => string;
    repoMarker: string;
    coreSkills: ReadonlySet<string>;
  },
): IsOurs {
  return (skill, path) => {
    if (opts.coreSkills.has(skill)) return path !== undefined && opts.resolve(path).includes(opts.repoMarker);
    if (current.has(skill)) return true;
    if (!aliases.has(skill)) return false;
    return path === undefined || opts.resolve(path).includes(opts.repoMarker) || !path.includes('/.agents/skills/');
  };
}
