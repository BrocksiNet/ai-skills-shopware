import { isNode } from './node.ts';
import type { Fact } from './facts.ts';

const FACT_KINDS: Record<Fact['kind'], true> = {
  unknown: true,
  missing: true,
  changed: true,
  internal: true,
  deprecated: true,
  experimental: true,
  'final-extended': true,
  'bc-change': true,
  moved: true,
  'guarded-everywhere': true,
};
const isText = (value: unknown): value is string => typeof value === 'string' && value !== '';
const isStrings = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((entry: unknown) => isText(entry));
const isRange = (value: unknown): value is [string, string] =>
  Array.isArray(value) && value.length === 2 && value.every((entry: unknown) => isText(entry));
function isFact(value: unknown): value is Fact {
  return (
    isNode(value) &&
    isText(value.target) &&
    isText(value.kind) &&
    Object.hasOwn(FACT_KINDS, value.kind) &&
    Array.isArray(value.releases) &&
    value.releases.every((entry: unknown) => isRange(entry)) &&
    (value.kind === 'unknown' || value.releases.length > 0) &&
    (value.value === undefined || typeof value.value === 'string') &&
    (value.via === undefined || isText(value.via))
  );
}

export interface VerificationReport {
  path: string;
  releases: string[];
  facts: Fact[];
  symbols: string[];
}

export function parseVerificationReport(report: unknown, path: string): VerificationReport {
  if (
    !isNode(report) ||
    !isStrings(report.releases) ||
    report.releases.length === 0 ||
    new Set(report.releases).size !== report.releases.length ||
    !isStrings(report.symbols) ||
    !Array.isArray(report.facts) ||
    !report.facts.every((entry: unknown) => isFact(entry))
  )
    throw new Error(`${path}: not a valid facts report`);
  for (const fact of report.facts)
    for (const [first, last] of fact.releases) {
      if (
        !report.releases.includes(first) ||
        !report.releases.includes(last) ||
        report.releases.indexOf(first) > report.releases.indexOf(last)
      )
        throw new Error(`${path}: fact range is outside or reversed within report releases`);
    }
  return {
    path: path.split('/').pop() ?? path,
    releases: report.releases,
    facts: report.facts,
    symbols: report.symbols,
  };
}
