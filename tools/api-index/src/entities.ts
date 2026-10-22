// The entity surface: entity names and their fields from the
// `defineFields()` of each `*Definition`, with the flags that change what an
// API client or an extension may do with a field. A field's property name
// comes from binding the constructor arguments to the field class's own
// constructor (see field-classes.ts). What cannot be read is left out and
// listed, never guessed.
import { ctorParams, type FieldClass, isField, resolvedArgs, walk } from './field-classes.ts';
import { type Chain, chainOf, featureTest, testedFlags, variableCalls } from './field-flow.ts';
import type { Flags, Item } from './model.ts';
import { child, children, classFqcn, nameOf, type Node, text } from './node.ts';
import { flagsOf, phpClasses } from './php.ts';
import { resolve, type Scope } from './php-scope.ts';
import { bindArgs, type ConstantLookup, isConstant, shortName, type Value, valueOf } from './php-value.ts';

/** The flags that change what a client or an extension may do with a field. */
const API_FLAGS = new Set([
  'ApiAware',
  'Required',
  'WriteProtected',
  'Runtime',
  'Computed',
  'Inherited',
  'PrimaryKey',
  'Immutable',
]);

/** `product_version_id` → `productVersionId`. */
function camel(storage: string): string {
  return storage.replaceAll(/_([a-z0-9])/gu, (_, letter: string) => letter.toUpperCase());
}

/** `v6.9.0.0` → `v6.9.0`, the form the PHP flags use. */
function removalVersion(value: Value | undefined): string {
  if (typeof value !== 'string') return '';
  const parts = value.replace(/^v/u, '').split('.');
  return `v${parts.slice(0, 3).join('.')}`;
}

function comments(node: Node): string {
  return children(node, 'leadingComments')
    .map((comment) => text(comment, 'value') ?? '')
    .join('\n');
}

function entityName(klass: Node, scope: Scope, constants?: ConstantLookup): string | undefined {
  for (const member of children(klass, 'body')) {
    if (member.kind !== 'classconstant') continue;
    for (const constant of children(member, 'constants')) {
      if (nameOf(constant) !== 'ENTITY_NAME') continue;
      const value = valueOf(child(constant, 'value'), scope, constants);
      if (typeof value === 'string') return value;
    }
  }
  const getter = children(klass, 'body').find(
    (member) => member.kind === 'method' && nameOf(member) === 'getEntityName',
  );
  const statement = children(child(getter ?? {}, 'body') ?? {}, 'children').find((node) => node.kind === 'return');
  const value = valueOf(child(statement ?? {}, 'expr'), scope, constants);
  return typeof value === 'string' ? value : undefined;
}

/** Entity names by definition class, for fields that point at another entity. */
export function definitionNames(code: string, file: string, constants?: ConstantLookup): Map<string, string> {
  const out = new Map<string, string>();
  for (const { node, scope } of phpClasses(code, file)) {
    const fqcn = classFqcn(node, scope.namespace);
    const name = entityName(node, scope, constants);
    if (fqcn !== undefined && name !== undefined) out.set(fqcn, name);
  }
  return out;
}

export interface EntityResult {
  items: Item[];
  /** Field classes of `new` expressions whose property name was not readable. */
  unreadable: string[];
}

interface Context {
  scope: Scope;
  classes: Map<string, FieldClass>;
  definitions: Map<string, string>;
}

/** The property name of a field: its `propertyName` argument, or for a
 *  `ReferenceVersionField` the name it derives from the entity it points at. */
function propertyOf(
  fieldClass: string,
  argument: (name: string) => Value | undefined,
  context: Context,
): string | undefined {
  const property = argument('propertyName');
  if (typeof property === 'string') return property;
  if (shortName(fieldClass) !== 'ReferenceVersionField') return undefined;
  const storage = argument('storageName');
  if (typeof storage === 'string') return camel(storage);
  const definition = argument('definition');
  const entity = isConstant(definition) ? context.definitions.get(definition.constant.split('::')[0] ?? '') : undefined;
  return entity === undefined ? undefined : camel(`${entity}_version_id`);
}

/** The API flags a chain adds, and a `Deprecated` flag as the deprecation. */
function chainFlags(chain: Chain, scope: Scope): { names: string[]; flags: Flags } {
  const names: string[] = [];
  const flags: Flags = {};
  for (const call of chain.calls.filter((entry) => entry.name === 'addFlags' || entry.name === 'setFlags')) {
    for (const arg of call.args) {
      if (arg.kind !== 'new') continue;
      const what = child(arg, 'what');
      const name = shortName(resolve(text(what, 'name') ?? '', text(what, 'resolution'), scope));
      if (API_FLAGS.has(name)) names.push(name);
      if (name === 'Deprecated') {
        const deprecated = bindArgs(children(arg, 'arguments'), ['deprecatedSince', 'willBeRemovedIn'], scope);
        flags.deprecated = removalVersion(deprecated.get('willBeRemovedIn'));
      }
    }
  }
  return { names, flags };
}

/** The field a node of `defineFields()` declares; undefined when it declares none. */
function fieldOf(
  candidate: Node,
  entity: string,
  context: Context,
  later: Chain['calls'] = [],
): Omit<Item, 'file'> | string | undefined {
  // A comment above an array entry belongs to the entry, not its value.
  const expression = candidate.kind === 'entry' ? child(candidate, 'value') : candidate;
  const found = expression === undefined ? undefined : chainOf(expression);
  if (expression === undefined || found === undefined) return undefined;
  const chain: Chain = { root: found.root, calls: [...found.calls, ...later] };
  const what = child(chain.root, 'what');
  const fieldClass = resolve(text(what, 'name') ?? '', text(what, 'resolution'), context.scope);
  if (!isField(fieldClass, context.classes)) return undefined;
  const params = (ctorParams(fieldClass, context.classes) ?? []).map((param) => param.name);
  const bound = bindArgs(children(chain.root, 'arguments'), params, context.scope);
  const args = resolvedArgs(fieldClass, bound, context.classes);
  const argument = (name: string): Value | undefined => args.get(name);
  const property = propertyOf(fieldClass, argument, context);
  if (property === undefined) return shortName(fieldClass);
  const { names, flags } = chainFlags(chain, context.scope);
  const note = `${comments(candidate)}\n${comments(expression)}`;
  if (flags.deprecated === undefined && /@deprecated\b/u.test(note)) {
    flags.deprecated = /tag:(v[\d.]+)/u.exec(note)?.[1] ?? '';
  }
  const reference = argument('referenceClass') ?? argument('referenceDefinition');
  const target = isConstant(reference) ? shortName(reference.constant.split('::')[0] ?? '') : undefined;
  const parts = [shortName(fieldClass)];
  if (target !== undefined) parts.push(`→${target.replace(/Definition$/u, '')}`);
  if (argument('autoload') === true) parts.push('autoload');
  parts.push(...[...new Set(names)].toSorted());
  return { id: `field:${entity}.${property}`, kind: 'field', signature: parts.join(' '), flags };
}

/** `v6.7.0.0` → `v6.7.0`; a flag that is not a major gives no version. */
function majorOf(flag: string): string {
  return /^v\d/u.test(flag) ? removalVersion(flag) : '';
}

function entityHead(node: Node, scope: Scope, entity: string, file: string): Item {
  const fqcn = classFqcn(node, scope.namespace) ?? '';
  const flags = flagsOf(node, scope, false);
  const head: Item = { id: `entity:${entity}`, kind: 'entity', file, signature: shortName(fqcn), flags: {} };
  if (flags.internal === true) head.flags.internal = true;
  if (flags.deprecated !== undefined) head.flags.deprecated = flags.deprecated;
  if (flags.experimental !== undefined) head.flags.experimental = flags.experimental;
  return head;
}

/** The fields one `defineFields()` declares with the flags in `on` active
 *  and every other feature flag off. A variable assigned twice keeps the
 *  last field. */
function fieldsWith(
  defineFields: Node,
  entity: string,
  context: Context,
  on: ReadonlySet<string>,
  unreadable: string[],
): Map<string, Omit<Item, 'file'>> {
  const fields = new Map<string, Omit<Item, 'file'>>();
  const assigned = variableCalls(defineFields, context.scope, on);
  const visitor =
    (later: Chain['calls'] = []) =>
    (candidate: Node): boolean => {
      const test = featureTest(candidate, context.scope);
      if (test !== undefined) {
        const branch = child(candidate, on.has(test.flag) ? test.on : test.off);
        if (branch !== undefined) walk(branch, visitor(later));
        return true;
      }
      // `$field = new XField(…)` with its flags added in later statements.
      const target = candidate.kind === 'assign' ? child(candidate, 'left') : undefined;
      const right = candidate.kind === 'assign' ? child(candidate, 'right') : undefined;
      if (target?.kind === 'variable' && right !== undefined) {
        walk(right, visitor([...later, ...(assigned.get(text(target, 'name') ?? '') ?? [])]));
        return true;
      }
      const field = fieldOf(candidate, entity, context, later);
      if (field === undefined) return false;
      if (typeof field === 'string') unreadable.push(field);
      else fields.set(field.id, field);
      return true;
    };
  walk(defineFields, visitor());
  return fields;
}

/** The fields of one `defineFields()` as a release ships them, with every
 *  feature flag off. A field a flag removes or declares differently is
 *  deprecated for the flag's major. */
function classFields(defineFields: Node, entity: string, context: Context, file: string, unreadable: string[]): Item[] {
  const missing: string[] = [];
  const fields = fieldsWith(defineFields, entity, context, new Set(), missing);
  unreadable.push(...missing.map((name) => `${file}: ${name}`));
  for (const flag of testedFlags(defineFields, context.scope)) {
    const variant = fieldsWith(defineFields, entity, context, new Set([flag]), []);
    for (const field of fields.values()) {
      if (field.flags.deprecated !== undefined || variant.get(field.id)?.signature === field.signature) continue;
      field.flags.deprecated = majorOf(flag);
    }
  }
  return [...fields.values()].map((field): Item => Object.assign(field, { file }));
}

/** What `EntityDefinition::defaultFields()` adds to every entity that does
 *  not define its own; `MappingEntityDefinition` adds nothing. */
const DEFAULT_FIELDS: [string, string][] = [
  ['createdAt', 'CreatedAtField ApiAware'],
  ['updatedAt', 'UpdatedAtField ApiAware'],
];

/** The entity class of a definition: what `getEntityClass()` returns, else
 *  the definition's name with `Entity` for `Definition`. */
function entityClassOf(node: Node, scope: Scope): string | undefined {
  const getter = children(node, 'body').find(
    (member) => member.kind === 'method' && nameOf(member) === 'getEntityClass',
  );
  const statement = children(child(getter ?? {}, 'body') ?? {}, 'children').find((entry) => entry.kind === 'return');
  const value = valueOf(child(statement ?? {}, 'expr'), scope);
  if (isConstant(value) && value.constant.endsWith('::class')) return value.constant.slice(0, -'::class'.length);
  return classFqcn(node, scope.namespace)?.replace(/Definition$/u, 'Entity');
}

/** A field whose property or getter on the entity class is deprecated is
 *  deprecated: core often marks the removal there and not on the field. */
function markEntityClass(fields: Item[], entityClass: string | undefined, members: Map<string, Item>): void {
  if (entityClass === undefined) return;
  for (const field of fields) {
    if (field.flags.deprecated !== undefined) continue;
    const property = field.id.split('.').pop() ?? '';
    const upper = `${property.charAt(0).toUpperCase()}${property.slice(1)}`;
    const marked = [`$${property}`, `get${upper}()`, `is${upper}()`]
      .map((member) => members.get(`php:${entityClass}::${member}`)?.flags.deprecated)
      .find((version) => version !== undefined);
    if (marked !== undefined) field.flags.deprecated = marked;
  }
}

/** Entities and fields declared in one PHP file. `members` are the PHP
 *  items by id, for deprecations on the entity class. */
export function entityItems(
  code: string,
  file: string,
  classes: Map<string, FieldClass>,
  definitions: Map<string, string>,
  members = new Map<string, Item>(),
): EntityResult {
  const items: Item[] = [];
  const unreadable: string[] = [];
  for (const { node, scope } of phpClasses(code, file)) {
    const defineFields = children(node, 'body').find(
      (member) => member.kind === 'method' && nameOf(member) === 'defineFields',
    );
    if (defineFields === undefined || node.kind !== 'class' || node.isAbstract === true) continue;
    const entity = definitions.get(classFqcn(node, scope.namespace) ?? '') ?? entityName(node, scope);
    if (entity === undefined) continue;
    const context: Context = { scope, classes, definitions };
    const fields = classFields(defineFields, entity, context, file, unreadable);
    const own = children(node, 'body').find((member) => member.kind === 'method' && nameOf(member) === 'defaultFields');
    const parent = text(child(node, 'extends'), 'name') ?? '';
    const defaults = own === undefined ? (parent.endsWith('MappingEntityDefinition') ? [] : DEFAULT_FIELDS) : [];
    const extra = own === undefined ? [] : classFields(own, entity, context, file, unreadable);
    markEntityClass([...fields, ...extra], entityClassOf(node, scope), members);
    const named = new Set(fields.map((field) => field.id));
    const inherited = defaults
      .map(([property, signature]): Item => ({
        id: `field:${entity}.${property}`,
        kind: 'field',
        file,
        signature,
        flags: {},
      }))
      .filter((field) => !named.has(field.id));
    items.push(entityHead(node, scope, entity, file), ...fields, ...extra, ...inherited);
  }
  return { items, unreadable };
}
