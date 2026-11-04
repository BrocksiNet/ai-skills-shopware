// Composer version constraints (`~6.6.0 || ~6.7.0`) as a test on a release
// name. Covers ~, ^, wildcards, comparisons, || and AND by space or comma.
import { versionParts } from './timeline.ts';

/** One comparison of a composer constraint. */
interface Bound {
  op: '>=' | '>' | '<=' | '<' | '=' | '!=';
  version: number[];
}

function compareParts(left: number[], right: number[]): number {
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    const diff = (left[index] ?? 0) - (right[index] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

interface Version {
  numbers: number[];
  wildcard: boolean;
}
const OPERATORS: (Bound['op'] | '==' | '~' | '^')[] = ['>=', '<=', '==', '!=', '>', '<', '=', '~', '^'];

const COMPARES: Record<Bound['op'], (diff: number) => boolean> = {
  '>=': (diff) => diff >= 0,
  '>': (diff) => diff > 0,
  '<=': (diff) => diff <= 0,
  '<': (diff) => diff < 0,
  '=': (diff) => diff === 0,
  '!=': (diff) => diff !== 0,
};

/** Parse the numeric version and its optional wildcard together. */
function parts(text: string): Version | undefined {
  const match = /^v?(\d+(?:\.\d+){0,3})(\.[*x])?$/iu.exec(text);
  if (match?.[1] === undefined) return undefined;
  const numbers = match[1].split('.').map(Number);
  return numbers.every((part) => Number.isSafeInteger(part))
    ? { numbers, wildcard: match[2] !== undefined }
    : undefined;
}

/** `[a, b+1]` for the parts that are given: `6.6` → `6.7`. */
function bump(version: number[], at: number): number[] {
  const out = version.slice(0, at + 1);
  out[at] = (out[at] ?? 0) + 1;
  return out;
}

/** One stable numeric term. Unsupported syntax is rejected instead of approximated. */
function pieceBounds(raw: string): Bound[] | undefined {
  const piece = raw.replace(/@(dev|alpha|beta|rc|stable)$/iu, '').replace(/-stable$/iu, '');
  if (/^(?:\*|x)$/iu.test(piece)) return [];
  const op = OPERATORS.find((operator) => piece.startsWith(operator));
  const parsed = parts(piece.slice(op?.length ?? 0));
  if (parsed === undefined || (parsed.wildcard && op !== undefined)) return undefined;
  const version = parsed.numbers;
  if (op === '~') {
    return [
      { op: '>=', version },
      { op: '<', version: bump(version, Math.max(0, version.length - 2)) },
    ];
  }
  if (op === '^') {
    const first = version.findIndex((part) => part !== 0);
    return [
      { op: '>=', version },
      { op: '<', version: bump(version, first === -1 ? version.length - 1 : first) },
    ];
  }
  if (parsed.wildcard)
    return [
      { op: '>=', version },
      { op: '<', version: bump(version, version.length - 1) },
    ];
  return [{ op: op === undefined || op === '==' ? '=' : op, version }];
}

function termBounds(term: string): Bound[] | undefined {
  const normalized = term.replaceAll(/(>=|<=|!=|==|>|<|=|~|\^)\s+(?=v?\d)/gu, '$1');
  const pieces = normalized.split(/[\s,]+/u).filter((piece) => piece !== '');
  if (pieces.length === 0) return undefined;
  const bounds: Bound[] = [];
  for (const raw of pieces) {
    const part = pieceBounds(raw);
    if (part === undefined) return undefined;
    bounds.push(...part);
  }
  return bounds;
}

/** A composer version constraint as a test on a release name. Undefined
 *  when the constraint cannot be read. */
export function parseConstraint(constraint: string): ((release: string) => boolean) | undefined {
  const terms: Bound[][] = [];
  for (const term of constraint.split(/\s*\|\|?\s*/u)) {
    const bounds = termBounds(term);
    if (bounds === undefined) return undefined;
    terms.push(bounds);
  }
  return (release) => {
    const version = versionParts(release);
    if (version === undefined) return false;
    return terms.some((bounds) => bounds.every((bound) => COMPARES[bound.op](compareParts(version, bound.version))));
  };
}
