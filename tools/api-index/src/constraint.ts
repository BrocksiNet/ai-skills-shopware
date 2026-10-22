// Composer version constraints (`~6.6.0 || ~6.7.0`) as a test on a release
// name. Covers ~, ^, wildcards, comparisons, || and AND by space or comma.
import { versionParts } from './timeline.ts';

/** One comparison of a composer constraint. */
interface Bound {
  op: '>=' | '>' | '<=' | '<' | '=';
  version: number[];
}

function compareParts(left: number[], right: number[]): number {
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    const diff = (left[index] ?? 0) - (right[index] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

function parts(text: string): number[] | undefined {
  const match = /^v?(\d+(?:\.(?:\d+|\*|x))*)/u.exec(text);
  if (match?.[1] === undefined) return undefined;
  const out: number[] = [];
  for (const part of match[1].split('.')) {
    if (part === '*' || part === 'x') break;
    out.push(Number(part));
  }
  return out;
}

/** `[a, b+1]` for the parts that are given: `6.6` → `6.7`. */
function bump(version: number[], at: number): number[] {
  const out = version.slice(0, at + 1);
  out[at] = (out[at] ?? 0) + 1;
  return out;
}

/** The bounds of one composer term: `~6.6.0`, `^6.6`, `6.6.*`, `>=6.5 <6.7`. */
function termBounds(term: string): Bound[] | undefined {
  const bounds: Bound[] = [];
  for (const raw of term.split(/[\s,]+/u).filter((piece) => piece !== '')) {
    const piece = raw.replace(/@\w+$/u, '').replace(/-(dev|rc\d*|beta\d*|alpha\d*)$/iu, '');
    const operator = /^(>=|<=|>|<|==|=|!=|~|\^)?(.*)$/u.exec(piece);
    const op = operator?.[1] ?? '';
    const version = parts(operator?.[2] ?? '');
    if (version === undefined) {
      if (piece === '*') continue;
      return undefined;
    }
    if (op === '~') {
      bounds.push({ op: '>=', version }, { op: '<', version: bump(version, Math.max(0, version.length - 2)) });
    } else if (op === '^') {
      const first = version.findIndex((part) => part !== 0);
      bounds.push(
        { op: '>=', version },
        { op: '<', version: bump(version, first === -1 ? version.length - 1 : first) },
      );
    } else if (op === '' && /[*x]/u.test(piece)) {
      bounds.push({ op: '>=', version }, { op: '<', version: bump(version, version.length - 1) });
    } else if (op === '' || op === '=' || op === '==') {
      const top = [...version, ...Array.from({ length: 4 - version.length }, () => Number.MAX_SAFE_INTEGER)];
      bounds.push({ op: '>=', version }, { op: '<=', version: top });
    } else if (op === '!=') {
      continue;
    } else if (op === '>=' || op === '>' || op === '<=' || op === '<') {
      bounds.push({ op, version });
    }
  }
  return bounds;
}

/** A composer version constraint as a test on a release name. Undefined
 *  when the constraint cannot be read. */
export function parseConstraint(constraint: string): ((release: string) => boolean) | undefined {
  const terms = constraint.split(/\s*\|\|?\s*/u).map((term) => termBounds(term.trim()));
  if (terms.some((term) => term === undefined)) return undefined;
  return (release) => {
    const version = versionParts(release);
    if (version === undefined) return false;
    return terms.some((bounds) =>
      (bounds ?? []).every((bound) => {
        const diff = compareParts(version, bound.version);
        switch (bound.op) {
          case '>=':
            return diff >= 0;
          case '>':
            return diff > 0;
          case '<=':
            return diff <= 0;
          case '<':
            return diff < 0;
          case '=':
            return diff === 0;
        }
        return false;
      }),
    );
  };
}
