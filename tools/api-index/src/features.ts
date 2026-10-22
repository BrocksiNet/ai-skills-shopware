// Feature flags from `feature.yaml`. A flag is deprecated when a
// `@deprecated` comment sits above it, its description starts with
// "Deprecated", or it is a major flag: those go when their major ships.
// A description starting with "Experimental", or naming a stableVersion,
// marks the flag experimental.
import { isMap, isScalar, isSeq, parseDocument } from 'yaml';
import type { Flags, Item } from './model.ts';

export const FEATURE_FILE = 'src/Core/Framework/Resources/config/packages/feature.yaml';

function deprecation(comment: string | null | undefined): Flags {
  if (comment === null || comment === undefined || !/@deprecated\b/u.test(comment)) return {};
  return { deprecated: /tag:(v[\d.]+)/u.exec(comment)?.[1] ?? '' };
}

function scalarText(node: unknown): string | undefined {
  if (!isScalar(node)) return undefined;
  const { value } = node;
  return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
    ? String(value)
    : undefined;
}

/** `v6.8.0.0` → `v6.8.0`; `true` names no version. */
function majorVersion(major: string): string {
  const parts = /^v?(\d+)\.(\d+)\.(\d+)/u.exec(major);
  return parts === null ? '' : `v${parts[1]}.${parts[2]}.${parts[3]}`;
}

/** Feature flags of `shopware.feature.flags`. */
export function featureItems(yaml: string, file = FEATURE_FILE): Item[] {
  const document = parseDocument(yaml);
  const flags = document.getIn(['shopware', 'feature', 'flags'], true);
  if (!isSeq(flags)) return [];
  const items: Item[] = [];
  for (const entry of flags.items) {
    if (!isMap(entry)) continue;
    const name = scalarText(entry.get('name', true));
    if (name === undefined) continue;
    const parts = ['default', 'major', 'toggleable'].map((key) => `${key}=${scalarText(entry.get(key, true)) ?? '-'}`);
    const description = scalarText(entry.get('description', true)) ?? '';
    const status: Flags = deprecation(entry.commentBefore);
    if (status.deprecated === undefined && /^deprecated\b/iu.test(description)) status.deprecated = '';
    const major = scalarText(entry.get('major', true)) ?? 'false';
    if (status.deprecated === undefined && major !== 'false') status.deprecated = majorVersion(major);
    if (/^experimental\b|\bexperimental stableVersion/iu.test(description)) status.experimental = '';
    items.push({ id: `feature:${name}`, kind: 'feature', file, signature: parts.join(' '), flags: status });
  }
  return items;
}
