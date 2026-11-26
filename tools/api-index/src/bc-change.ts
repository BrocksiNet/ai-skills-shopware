// Caller vs extender attribution for PHP BCChange attributes (plan WP D step 5).
// Maps `Shopware\Core\Framework\Deprecation\BCChange\*` names to the sub-interfaces
// they implement in core: `CallSiteCompatibilityChange` (callers),
// `ExtenderCompatibilityChange` (extenders), or both.

export type BcAudience = 'callers' | 'extenders';

const AUDIENCE: Readonly<Record<string, readonly BcAudience[]>> = {
  // CallSiteCompatibilityChange only
  CallSiteCompatibilityChange: ['callers'],
  ExceptionChange: ['callers'],
  ParameterDefaultValueChange: ['callers'],
  ParameterNameChange: ['callers'],
  ParameterTypeNarrowing: ['callers'],
  ReturnTypeWidening: ['callers'],
  // ExtenderCompatibilityChange only
  ExtenderCompatibilityChange: ['extenders'],
  BecomesAbstract: ['extenders'],
  BecomesFinal: ['extenders'],
  NewOptionalParameter: ['extenders'],
  ParameterTypeWidening: ['extenders'],
  ReturnTypeNarrowing: ['extenders'],
  // Both CallSiteCompatibilityChange and ExtenderCompatibilityChange
  BecomesInternal: ['callers', 'extenders'],
  BecomesReadonly: ['callers', 'extenders'],
  ClassHierarchyChange: ['callers', 'extenders'],
  ClassMoved: ['callers', 'extenders'],
  ExperimentalReplacement: ['callers', 'extenders'],
  NewRequiredParameter: ['callers', 'extenders'],
  ParameterRemoval: ['callers', 'extenders'],
  PropertyTypeNarrowing: ['callers', 'extenders'],
  PropertyTypeWidening: ['callers', 'extenders'],
  VisibilityChange: ['callers', 'extenders'],
};

/** `ReturnTypeNarrowing@v6.8.0` → `ReturnTypeNarrowing`. */
export function bcChangeName(entry: string): string {
  const at = entry.indexOf('@');
  return (at === -1 ? entry : entry.slice(0, at)).trim();
}

/** Who has to act for one or more `Name@version` BCChange entries, in canonical
 *  order (`callers`, `extenders`), or undefined when no entry is recognized. */
export function bcChangeAffects(entries: readonly string[]): BcAudience[] | undefined {
  let callers = false;
  let extenders = false;
  for (const entry of entries) {
    const audiences = AUDIENCE[bcChangeName(entry)];
    if (audiences === undefined) continue;
    if (audiences.includes('callers')) callers = true;
    if (audiences.includes('extenders')) extenders = true;
  }
  const result: BcAudience[] = [];
  if (callers) result.push('callers');
  if (extenders) result.push('extenders');
  return result.length === 0 ? undefined : result;
}

/** Human-readable audience text: `callers`, `extenders`, or `callers and extenders`. */
export function formatBcAffects(affects: readonly BcAudience[] | undefined): string {
  if (affects === undefined || affects.length === 0) return '';
  return affects.join(' and ');
}
