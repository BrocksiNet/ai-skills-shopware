// The signatures of admin props, methods and computed members as text, and
// the changes between two of them an extension notices. No dependencies:
// `api-diff` and `api-facts` read them from the index.
//
//   prop      `required String|Number`, `optional Object as Entity<'product'>`
//             (older indexes: just `required` / `optional`)
//   method    `(event: Event, axis?: 'x' | 'y', ...rest): void`, `async (id)`
//   computed  `returns Record<string, string>`, `settable`, both, or ''

/** Splits `text` at `separator` outside brackets, quotes and generics. */
export function splitTop(text: string, separator: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let quote = '';
  let start = 0;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index] ?? '';
    if (quote !== '') {
      if (char === quote && text[index - 1] !== '\\') quote = '';
      continue;
    }
    if (char === "'" || char === '"' || char === '`') quote = char;
    else if ('([{<'.includes(char)) depth += 1;
    else if (')]}>'.includes(char) && !(char === '>' && text[index - 1] === '=')) depth -= 1;
    else if (depth === 0 && text.startsWith(separator, index)) {
      parts.push(text.slice(start, index).trim());
      start = index + separator.length;
      index = start - 1;
    }
  }
  parts.push(text.slice(start).trim());
  return parts.filter((part) => part !== '');
}

export interface Param {
  /** The name, or `{}` / `[]` for a destructured parameter. */
  name: string;
  optional: boolean;
  rest: boolean;
  type?: string;
}

export interface MethodShape {
  async: boolean;
  params: Param[];
  returns?: string;
}

function formatParam(param: Param): string {
  const type = param.type === undefined ? '' : `: ${param.type}`;
  return `${param.rest ? '...' : ''}${param.name}${param.optional && !param.rest ? '?' : ''}${type}`;
}

export function formatMethod(shape: MethodShape): string {
  const returns = shape.returns === undefined ? '' : `: ${shape.returns}`;
  return `${shape.async ? 'async ' : ''}(${shape.params.map(formatParam).join(', ')})${returns}`;
}

function parseParam(text: string): Param | undefined {
  const match = /^(\.\.\.)?(\{\}|\[\]|[\w$]+)(\?)?(?::\s*([\s\S]+))?$/u.exec(text);
  if (match === null) return undefined;
  const param: Param = { name: match[2] ?? '', optional: match[3] !== undefined, rest: match[1] !== undefined };
  if (match[4] !== undefined) param.type = match[4];
  return param;
}

/** The shape of a method signature; undefined for an empty one (an older
 *  index, or a storefront plugin method). */
export function parseMethod(signature: string): MethodShape | undefined {
  const async = signature.startsWith('async ');
  const text = async ? signature.slice('async '.length) : signature;
  if (!text.startsWith('(')) return undefined;
  let depth = 0;
  let close = -1;
  for (let index = 0; index < text.length && close < 0; index += 1) {
    const char = text[index] ?? '';
    if (char === '(') depth += 1;
    else if (char === ')') {
      depth -= 1;
      if (depth === 0) close = index;
    }
  }
  if (close < 0) return undefined;
  const params: Param[] = [];
  for (const part of splitTop(text.slice(1, close), ',')) {
    const param = parseParam(part);
    if (param === undefined) return undefined;
    params.push(param);
  }
  const rest = text.slice(close + 1).trim();
  const shape: MethodShape = { async, params };
  if (rest.startsWith(':')) shape.returns = rest.slice(1).trim();
  return shape;
}

const required = (param: Param | undefined): boolean => param !== undefined && !param.optional && !param.rest;

/** By position: names do not matter, a caller passes arguments in order.
 *  A type that appears where there was none is not a change: that is a
 *  JavaScript file moving to TypeScript. */
export function methodChange(base: string, head: string): string | undefined {
  const before = parseMethod(base);
  const after = parseMethod(head);
  if (before === undefined || after === undefined) return undefined;
  const notes: string[] = [];
  const takesRest = after.params.some((param) => param.rest);
  after.params.forEach((param, index) => {
    const old = before.params[index];
    if (required(param) && !required(old) && old?.rest !== true) notes.push(`new required parameter ${param.name}`);
  });
  before.params.forEach((param, index) => {
    const now = after.params[index];
    if (now === undefined) {
      if (!takesRest) notes.push(`parameter ${param.name} removed`);
      return;
    }
    if (param.type !== undefined && now.type !== undefined && param.type !== now.type)
      notes.push(`parameter ${now.name} type ${param.type} → ${now.type}`);
  });
  if (before.async !== after.async) notes.push(after.async ? 'now async' : 'no longer async');
  if (before.returns !== undefined && after.returns !== undefined && before.returns !== after.returns)
    notes.push(`returns ${before.returns} → ${after.returns}`);
  return notes.length === 0 ? undefined : notes.join(', ');
}

export interface PropShape {
  required: boolean;
  /** The runtime constructors Vue checks: `String`, `Number`, … */
  runtime: string[];
  /** The TypeScript type of a `PropType<…>` cast. */
  type?: string;
}

export function formatProp(shape: PropShape): string {
  const runtime = shape.runtime.length === 0 ? '' : ` ${shape.runtime.join('|')}`;
  const type = shape.type === undefined ? '' : ` as ${shape.type}`;
  return `${shape.required ? 'required' : 'optional'}${runtime}${type}`;
}

export function parseProp(signature: string): PropShape {
  const [mode = '', ...rest] = signature.split(' ');
  const [runtime = '', ...type] = rest.join(' ').split(' as ');
  const shape: PropShape = { required: mode === 'required', runtime: runtime === '' ? [] : runtime.split('|') };
  if (type.length > 0) shape.type = type.join(' as ');
  return shape;
}

/** A prop that becomes required, or no longer accepts a type it accepted.
 *  A type on a prop that had none narrows nothing a caller relied on in
 *  the index: it was any before, and the index cannot tell what was passed. */
export function propChange(base: string, head: string): string | undefined {
  const before = parseProp(base);
  const after = parseProp(head);
  const notes: string[] = [];
  if (!before.required && after.required) notes.push('now required');
  const accepted = new Set(after.runtime);
  const lost = before.runtime.filter((type) => !accepted.has(type));
  if (after.runtime.length > 0 && lost.length > 0)
    notes.push(`type ${before.runtime.join('|')} → ${after.runtime.join('|')}`);
  else if (before.type !== undefined && after.type !== undefined && before.type !== after.type)
    notes.push(`type ${before.type} → ${after.type}`);
  return notes.length === 0 ? undefined : notes.join(', ');
}

export interface ComputedShape {
  returns?: string;
  settable: boolean;
}

export function formatComputed(shape: ComputedShape): string {
  const parts = shape.returns === undefined ? [] : [`returns ${shape.returns}`];
  if (shape.settable) parts.push('settable');
  return parts.join(', ');
}

export function parseComputed(signature: string): ComputedShape {
  const parts = splitTop(signature, ', ');
  const returns = parts.find((part) => part.startsWith('returns '))?.slice('returns '.length);
  const shape: ComputedShape = { settable: parts.includes('settable') };
  if (returns !== undefined) shape.returns = returns;
  return shape;
}

export function computedChange(base: string, head: string): string | undefined {
  const before = parseComputed(base);
  const after = parseComputed(head);
  const notes: string[] = [];
  if (before.returns !== undefined && after.returns !== undefined && before.returns !== after.returns)
    notes.push(`type ${before.returns} → ${after.returns}`);
  if (before.settable && !after.settable) notes.push('no longer settable');
  return notes.length === 0 ? undefined : notes.join(', ');
}

/** A change to a prop, method or computed member, by its kind; undefined
 *  for other kinds and for no change. */
export function memberChange(kind: string, base: string, head: string): string | undefined {
  if (base === head) return undefined;
  if (kind === 'prop') return propChange(base, head);
  if (kind === 'js-method') return methodChange(base, head);
  if (kind === 'computed') return computedChange(base, head);
  return undefined;
}
