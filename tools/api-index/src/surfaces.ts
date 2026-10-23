// Which surface an item belongs to, which item owns it, and how the
// admin, storefront and build items change in a way an extension notices.
import type { Item } from './model.ts';

export type Surface = 'route' | 'entity' | 'feature' | 'config' | 'admin' | 'storefront' | 'twig' | 'build' | 'php';

export const SURFACES: Surface[] = [
  'route',
  'entity',
  'feature',
  'config',
  'admin',
  'storefront',
  'twig',
  'build',
  'php',
];

export function surfaceOf(item: Item): Surface {
  const { kind, id } = item;
  if (kind === 'route' || kind === 'feature' || kind === 'config' || kind === 'twig' || kind === 'build') return kind;
  if (kind === 'entity' || kind === 'field') return 'entity';
  if (id.startsWith('admin:') || id.startsWith('position:') || id.startsWith('global:')) return 'admin';
  if (id.startsWith('storefront:') || id.startsWith('js-plugin:')) return 'storefront';
  return 'php';
}

/** The component, plugin or template a frontend member belongs to:
 *  `admin:sw-card.prop.title` → `admin:sw-card`. */
export function memberOwner(id: string): string | undefined {
  // Component and plugin names hold no `.` or `#`; template paths do hold dots.
  if (id.startsWith('admin:') || id.startsWith('js-plugin:')) {
    const end = id.search(/[.#]/u);
    return end < 0 ? undefined : id.slice(0, end);
  }
  if (id.startsWith('storefront:') && id.includes('#')) return id.slice(0, id.indexOf('#'));
  return undefined;
}

/** The item that owns another: a field's entity, a key's parent key, a
 *  member's class, component, template or plugin. */
export function ownerOf(item: Item): string | undefined {
  const { id } = item;
  if (item.kind === 'field') return `entity:${id.slice('field:'.length).split('.')[0] ?? ''}`;
  if (item.kind === 'config') return `config:${id.slice('config:'.length).split('.').slice(0, -1).join('.')}`;
  if (id.startsWith('php:') && id.includes('::')) return id.split('::')[0];
  const member = memberOwner(id);
  if (member !== undefined) return member;
  if (id.startsWith('global:')) {
    const owner = id.slice(0, id.lastIndexOf('.'));
    return owner === 'global:Shopware' ? undefined : owner;
  }
  return undefined;
}

/** What a component or template inherits from, by its signature at a
 *  release: `extends sw-text-field`, or the template it `sw_extends`. */
export function parentOwner(owner: string, signature: string | undefined): string | undefined {
  if (owner.startsWith('admin:') && signature?.startsWith('extends ') === true)
    return `admin:${signature.slice('extends '.length)}`;
  if (owner.startsWith('storefront:') && signature?.startsWith('@Storefront/') === true)
    return `storefront:${signature}`;
  return undefined;
}

/** A change to an admin or storefront item an extension notices. */
export function frontendChange(base: Item, head: Item): string | undefined {
  const before = base.signature ?? '';
  const after = head.signature ?? '';
  if (before === after) return undefined;
  if (base.kind === 'prop' && after === 'required') return 'now required';
  if (base.kind === 'component' && before.startsWith('extends ')) return `${before} → ${after}`;
  if (base.kind === 'js-plugin' && before !== '') return `selector ${before} → ${after === '' ? '-' : after}`;
  return undefined;
}
