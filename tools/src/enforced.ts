// The "Already enforced by CI (do not repeat)" section of a SKILL.md (plan
// WP3), generated from the `trunk.enforced_by` entries of the skill's active
// rules in rules/catalog.json.
//
// Up to MAX_BULLETS checks are listed in SKILL.md itself. Above that, the
// list moves to a generated references/enforced-by-ci.md and SKILL.md keeps a
// pointer, so the always-loaded body stays short.
//
// The block between the markers is generated; the renderer replaces it,
// appends the section when a skill gains its first enforced rule, and drops
// it (and the reference) when the last one goes.
import { type Catalog, type Enforcement, type EnforcementKind, type Rule, isActive } from './catalog.ts';

export const HEADING = '## Already enforced by CI (do not repeat)';
export const START =
  '<!-- enforced:start: generated from rules/catalog.json by `node tools/bin/render-enforced.ts`; do not edit -->';
export const END = '<!-- enforced:end -->';
/** Above this, the list moves to REFERENCE (plan WP3). */
export const MAX_BULLETS = 10;
/** Skill-relative path of the overflow list. */
export const REFERENCE = 'references/enforced-by-ci.md';

const KIND: Record<EnforcementKind, string> = {
  phpstan: 'PHPStan',
  danger: 'Danger',
  eslint: 'ESLint',
  ecs: 'ECS',
  'php-cs-fixer': 'PHP-CS-Fixer',
  phpunit: 'PHPUnit',
  test: 'test',
};

export interface EnforcedItem {
  rule: Rule;
  check: Enforcement;
}

/** What render() produces for one skill. */
export interface Rendered {
  /** SKILL.md text. */
  skill: string;
  /** Content of REFERENCE, or null when the skill must not have one. */
  reference: string | null;
}

export function enforcedItems(catalog: Catalog, skill: string): EnforcedItem[] {
  return catalog.rules
    .filter((rule) => rule.skill === skill && isActive(rule))
    .flatMap((rule) => (rule.trunk?.enforced_by ?? []).map((check) => ({ rule, check })));
}

const sentence = (text: string): string => text.trim().replace(/[.;]+$/u, '');

export function renderBullet({ rule, check }: EnforcedItem): string {
  const where = check.trunk_only ? `${KIND[check.kind]}, trunk only` : KIND[check.kind];
  return `- \`${rule.id}\` \`${check.tool}\` (${where}) ${sentence(check.catches)}. It misses ${sentence(check.misses)}; flag those.`;
}

function intro(items: EnforcedItem[]): string[] {
  const lines = [
    'CI already fails the build on these, so do not repeat them in reviews or',
    'checklists. Flag only what each check misses.',
  ];
  if (items.some((i) => i.check.trunk_only)) {
    lines.push(
      'Checks marked *trunk only* are not active in plugin or app projects by',
      'default; there the rule still needs a reviewer.',
    );
  }
  return lines;
}

/** The generated SKILL.md block, markers included. */
export function renderBlock(items: EnforcedItem[]): string {
  const body =
    items.length > MAX_BULLETS
      ? [
          `CI already fails the build on ${items.length} checks for this skill's rules. Before you`,
          `flag a finding or write a checklist, read [\`${REFERENCE}\`](${REFERENCE})`,
          'and flag only what each check misses.',
        ]
      : [...intro(items), '', ...items.map((item) => renderBullet(item))];
  return [START, ...body, END].join('\n');
}

export function renderReference(items: EnforcedItem[]): string {
  return [
    '# Already enforced by CI (do not repeat)',
    '',
    `<!-- generated from rules/catalog.json by \`node tools/bin/render-enforced.ts\`; do not edit -->`,
    '',
    ...intro(items),
    '',
    ...items.map((item) => renderBullet(item)),
    '',
  ].join('\n');
}

/** Marker lines, and the section heading above them (-1 when missing). */
function sectionBounds(lines: string[]): { heading: number; start: number; end: number } | null {
  const start = lines.findIndex((l) => l.startsWith('<!-- enforced:start'));
  const end = lines.findIndex((l) => l === END);
  if (start === -1 && end === -1) return null;
  if (start === -1 || end === -1 || end < start) throw new Error('unbalanced enforced:start / enforced:end markers');
  const heading = lines.lastIndexOf(HEADING, start);
  return { heading, start, end };
}

/** Returns the SKILL.md text with the section brought in line with `items`. */
export function applySection(text: string, items: EnforcedItem[]): string {
  const lines = text.replace(/\n+$/u, '').split('\n');
  const bounds = sectionBounds(lines);
  if (items.length === 0) {
    if (bounds === null) return text;
    const from = bounds.heading === -1 ? bounds.start : bounds.heading;
    const kept = [...lines.slice(0, from), ...lines.slice(bounds.end + 1)];
    return kept.join('\n').replace(/\n+$/u, '') + '\n';
  }
  const block = renderBlock(items).split('\n');
  if (bounds === null) return [...lines, '', HEADING, '', ...block].join('\n') + '\n';
  return [...lines.slice(0, bounds.start), ...block, ...lines.slice(bounds.end + 1)].join('\n') + '\n';
}

export function render(skillText: string, items: EnforcedItem[]): Rendered {
  return {
    skill: applySection(skillText, items),
    reference: items.length > MAX_BULLETS ? renderReference(items) : null,
  };
}
