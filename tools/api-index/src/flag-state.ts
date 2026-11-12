// Feature flag states of admin items (plan WP C step 1). Core puts new
// markup behind `v-if="feature.isActive('v6.8.0.0')"` and keeps the old one
// in the `v-else`, and registers a component only with a flag off
// (`if (!Shopware.Feature.isActive('v6.8.0.0')) Component.register(…)`).
// Both twig blocks stay in the file, but an override of the old one does
// nothing once the flag is on. An item that exists in one state only gets a
// marker: `from` (flag on only) or `until` (flag off only), with the major
// version for a major flag (`v6.8.0`) and the flag name for any other.
import type { Node } from '@babel/types';
import { memberName, stringOf } from './js.ts';

export interface FlagState {
  /** Exists only with this flag on. */
  from?: string;
  /** Exists only with this flag off. */
  until?: string;
}

/** `v6.8.0.0` and `V6_8_0_0` → `v6.8.0`; any other flag keeps its name. */
export function flagMarker(flag: string): string {
  const parts = /^v?(\d+)[._](\d+)[._](\d+)(?:[._]\d+)?$/iu.exec(flag);
  return parts === null ? flag : `v${parts[1]}.${parts[2]}.${parts[3]}`;
}

/** The outer state wins: an item inside two gates keeps the first. */
function merge(outer: FlagState, inner: FlagState): FlagState {
  const state: FlagState = { ...outer };
  if (state.from === undefined && inner.from !== undefined) state.from = inner.from;
  if (state.until === undefined && inner.until !== undefined) state.until = inner.until;
  return state;
}

const flip = (state: FlagState): FlagState =>
  state.from === undefined ? (state.until === undefined ? {} : { from: state.until }) : { until: state.from };

/** A condition: the state it implies when true, and when false. `whenFalse`
 *  is known only for a lone flag check; `a && flag` failing says nothing. */
interface Condition {
  whenTrue: FlagState;
  whenFalse: FlagState;
}

const NOTHING: Condition = { whenTrue: {}, whenFalse: {} };

const CHECK = /^(!?)\s*(?:[\w$]+\.)*feature\.isActive\(\s*(['"])([^'"]+)\2\s*\)$/iu;

/** A `v-if` value: flag checks joined by `&&`. With an `||` it says nothing. */
export function templateCondition(expression: string): Condition {
  if (expression.includes('||')) return NOTHING;
  const parts = expression.split('&&').map((part) =>
    part
      .trim()
      .replace(/^\((.*)\)$/u, '$1')
      .trim(),
  );
  let whenTrue: FlagState = {};
  let checks = 0;
  for (const part of parts) {
    const match = CHECK.exec(part);
    if (match?.[3] === undefined) continue;
    checks += 1;
    const marker = flagMarker(match[3]);
    whenTrue = merge(whenTrue, match[1] === '!' ? { until: marker } : { from: marker });
  }
  const lone = checks === 1 && parts.length === 1;
  return { whenTrue, whenFalse: lone ? flip(whenTrue) : {} };
}

/** A JS `if` test: `Feature.isActive('…')` or its negation, through a
 *  member chain (`Shopware.Feature.isActive`). */
export function scriptCondition(test: Node): Condition {
  const negated = test.type === 'UnaryExpression' && test.operator === '!';
  const call = negated ? test.argument : test;
  if (call.type !== 'CallExpression') return NOTHING;
  const callee = memberName(call.callee) ?? '';
  if (!/(?:^|\.)Feature\.isActive$/u.test(callee)) return NOTHING;
  const flag = stringOf(call.arguments[0]);
  if (flag === undefined) return NOTHING;
  const marker = flagMarker(flag);
  const whenTrue: FlagState = negated ? { until: marker } : { from: marker };
  return { whenTrue, whenFalse: flip(whenTrue) };
}

export interface TemplateStates {
  /** Gated blocks by name; a block missing here exists in both states. */
  blocks: Map<string, FlagState>;
  /** Gated slots by name: only when every `<slot>` of that name is gated the same way. */
  slots: Map<string, FlagState>;
}

interface Frame {
  tag: string;
  state: FlagState;
  /** What the open `v-if` chain among the children implies for the next
   *  `v-else-if` / `v-else`; null when no chain is open. */
  chain: FlagState | null;
}

const VOID = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'source',
  'track',
  'wbr',
]);

const TOKEN =
  /\{#[\s\S]*?#\}|<!--[\s\S]*?-->|\{%-?\s*block\s+(\w+)|<\/([A-Za-z][\w.-]*)\s*>|<([A-Za-z][\w.-]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/gu;

function attribute(attrs: string, name: string): string | undefined {
  const match = new RegExp(`(?:^|\\s)${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, 'u').exec(attrs);
  return match === null ? undefined : (match[1] ?? match[2]);
}

/** The state an element's own `v-if` / `v-else-if` / `v-else` gives it,
 *  and the chain its parent keeps for the next sibling. */
function ownState(attrs: string, parent: Frame): FlagState {
  const vIf = attribute(attrs, 'v-if');
  const vElseIf = attribute(attrs, 'v-else-if');
  if (vIf !== undefined) {
    const condition = templateCondition(vIf);
    parent.chain = condition.whenFalse;
    return condition.whenTrue;
  }
  if (vElseIf !== undefined) {
    const condition = templateCondition(vElseIf);
    const before = parent.chain ?? {};
    parent.chain = parent.chain === null ? null : merge(parent.chain, condition.whenFalse);
    return merge(before, condition.whenTrue);
  }
  if (/(?:^|\s)v-else(?=[\s/]|$)/u.test(attrs)) {
    const before = parent.chain ?? {};
    parent.chain = null;
    return before;
  }
  parent.chain = null;
  return {};
}

const same = (a: FlagState, b: FlagState): boolean => a.from === b.from && a.until === b.until;
const gated = (state: FlagState): boolean => state.from !== undefined || state.until !== undefined;

/** The flag states of an admin template's blocks and slots. */
export function templateStates(source: string): TemplateStates {
  const root: Frame = { tag: '', state: {}, chain: null };
  const stack: Frame[] = [root];
  const blocks = new Map<string, FlagState>();
  const slotSeen = new Map<string, FlagState | null>();
  for (const match of source.matchAll(TOKEN)) {
    const [, block, closing, opening, attrs = ''] = match;
    const top = stack.at(-1) ?? root;
    if (block !== undefined) {
      if (gated(top.state)) blocks.set(block, top.state);
    } else if (closing !== undefined) {
      const at = stack.findLastIndex((frame) => frame.tag === closing.toLowerCase());
      if (at > 0) stack.length = at;
    } else if (opening !== undefined) {
      const tag = opening.toLowerCase();
      const state = merge(top.state, ownState(attrs, top));
      if (tag === 'slot') {
        const name = attribute(attrs, 'name') ?? 'default';
        const earlier = slotSeen.get(name);
        slotSeen.set(name, earlier === undefined || (earlier !== null && same(earlier, state)) ? state : null);
      }
      if (!attrs.trimEnd().endsWith('/') && !VOID.has(tag)) stack.push({ tag, state, chain: null });
    }
  }
  const slots = new Map<string, FlagState>();
  for (const [name, state] of slotSeen) if (state !== null && gated(state)) slots.set(name, state);
  return { blocks, slots };
}

/** Copies a state onto an item's flags. */
export function applyState(flags: FlagState, state: FlagState | undefined): void {
  if (state?.from !== undefined) flags.from = state.from;
  if (state?.until !== undefined) flags.until = state.until;
}
