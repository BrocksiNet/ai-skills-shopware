// Observe returned tool results, not self-reported citations or directory listings.
import { jsonLines } from './agent-events.ts';

type Json = Record<string, unknown>;
const isObject = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v);
const object = (v: unknown): Json => (isObject(v) ? v : {});
const text = (v: unknown): string => (typeof v === 'string' ? v : '');
const blocks = (v: unknown): Json[] => (Array.isArray(v) ? v.map((b: unknown) => object(b)) : []);
const body = (v: unknown): string =>
  typeof v === 'string'
    ? v
    : blocks(v)
        .map((b) => text(b.text))
        .join('\n');

export interface ReferenceRead {
  reference: string;
  tool: 'Read' | 'Bash';
  call_id: string;
  extent?: 'excerpt';
}

interface Call {
  id: string;
  name: string;
  input: Json;
}

const escapeRegex = (s: string): string => s.replaceAll(/[.*+?^${}()|[\]\\]/gu, String.raw`\$&`);

/** Statically bound reference directories; dynamic assignments stay unconfirmed. */
function boundOperands(command: string, skill: string, filename: string): string[] {
  const binding = new RegExp(
    String.raw`(?:^|[;&]\s*)([A-Za-z_]\w*)=["']?([^\s;&|"'$]+/${escapeRegex(skill)}/references)["']?(?=\s*(?:[;&|]|$))`,
    'gu',
  );
  const operands: string[] = [];
  for (const match of command.matchAll(binding)) {
    const name = match[1];
    if (name === undefined || [...command.matchAll(new RegExp(String.raw`\b${escapeRegex(name)}=`, 'gu'))].length !== 1)
      continue;
    operands.push(`$${name}/${filename}`, `\${${name}}/${filename}`);
  }
  return operands;
}

/** Literal file reads, including explicit cd and static directory assignments.
 * Wildcards, dynamic paths and implicit persistent cwd remain unconfirmed. */
function shellTargets(command: string, reference: string): boolean {
  const [skill, ...parts] = reference.split('/');
  const filename = parts.at(-1);
  if (skill === undefined || filename === undefined) return false;
  const targets = [reference, ...boundOperands(command, skill, filename)];
  const context = (suffix: string): boolean =>
    new RegExp(String.raw`\bcd\s+[^;&|]*/${escapeRegex(skill + suffix)}["']?(?=\s*(?:[;&|]|$))`, 'u').test(command);
  if (context('')) targets.push(parts.join('/'));
  if (context('/references')) targets.push(filename);
  return targets.some((target) => {
    const file = String.raw`[\s/"']${escapeRegex(target)}["']?`;
    const cat = new RegExp(String.raw`(?:^|[\s;&|])cat(?=\s)[^;&|]*${file}(?=[\s;&|]|$)`, 'u');
    const single = new RegExp(
      String.raw`(?:^|[\s;&|])(?:sed|head|tail|grep|rg)(?=\s)[^;&|]*${file}(?=\s*(?:[;&|]|$))`,
      'u',
    );
    return cat.test(command) || single.test(command);
  });
}

function returnedReads(call: Call, returned: string, references: Map<string, string>): ReferenceRead[] {
  const reads: ReferenceRead[] = [];
  const path = text(call.input.file_path).replaceAll('\\', '/');
  for (const [reference, source] of references) {
    const contentReturned = source
      .split('\n')
      .some((line) => line.trim().length >= 24 && returned.includes(line.trim()));
    if (call.name === 'Read' && (path === reference || path.endsWith(`/${reference}`)) && contentReturned) {
      reads.push({ reference, tool: 'Read', call_id: call.id });
    } else if (call.name === 'Bash' && contentReturned && shellTargets(text(call.input.command), reference)) {
      const complete = returned.replaceAll('\r\n', '\n').includes(source.trim());
      reads.push({ reference, tool: 'Bash', call_id: call.id, ...(complete ? {} : { extent: 'excerpt' }) });
    }
  }
  return reads;
}

/** Claude traces are currently supported; unsupported formats remain unobservable. */
export function referenceReads(
  trace: string,
  references: Map<string, string>,
): { observable: boolean; reads: ReferenceRead[] } {
  const events = jsonLines(trace);
  const calls = new Map<string, Call>();
  const reads: ReferenceRead[] = [];
  for (const event of events) {
    const content = blocks(object(event.message).content);
    if (event.type === 'assistant') {
      for (const b of content)
        if (b.type === 'tool_use') {
          const id = text(b.id);
          calls.set(id, { id, name: text(b.name), input: object(b.input) });
        }
    } else if (event.type === 'user') {
      for (const b of content) {
        const call = calls.get(text(b.tool_use_id));
        if (call === undefined || b.is_error === true) continue;
        const returned = body(b.content);
        if (returned.trim() === '') continue;
        reads.push(...returnedReads(call, returned, references));
      }
    }
  }
  return { observable: events.some((e) => e.type === 'system' && e.subtype === 'init'), reads };
}
