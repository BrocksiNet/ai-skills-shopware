// The admin and storefront surfaces of one ref, and which bundler each
// builds with: `build:admin.vite`, `build:admin.webpack` and
// `build:storefront.webpack` exist while the config file does.
import { errorMessage } from '../../src/errors.ts';
import { componentItems, globalItems, isAdminSource, positionItems, registrations, SHOPWARE_GLOBAL } from './admin.ts';
import { readFiles } from './git.ts';
import type { Item } from './model.ts';
import {
  isStorefrontSource,
  isStorefrontTemplate,
  pluginItems,
  pluginRegistrations,
  STOREFRONT_MAIN,
  templateItems,
} from './storefront.ts';
import { twigItems } from './twig-php.ts';

const BUILDS: [string, RegExp][] = [
  ['build:admin.vite', /^src\/Administration\/Resources\/app\/administration\/vite\.config\.m?[jt]s$/u],
  ['build:admin.webpack', /^src\/Administration\/Resources\/app\/administration\/webpack\.config\.js$/u],
  ['build:storefront.vite', /^src\/Storefront\/Resources\/app\/storefront\/vite\.config\.m?[jt]s$/u],
  ['build:storefront.webpack', /^src\/Storefront\/Resources\/app\/storefront\/webpack\.config\.js$/u],
];

function buildItems(all: string[]): Item[] {
  const items: Item[] = [];
  for (const [id, pattern] of BUILDS) {
    const file = all.find((path) => pattern.test(path));
    if (file !== undefined) items.push({ id, kind: 'build', file, signature: '', flags: {} });
  }
  return items;
}

function adminItems(files: Map<string, string>, unread: string[]): Item[] {
  const paths = new Set(files.keys());
  const items: Item[] = [];
  for (const [path, code] of files) {
    try {
      if (path.endsWith('.html.twig')) items.push(...positionItems(code, path));
      else if (/Component\.(?:register|extend)\(/u.test(code))
        for (const registration of registrations(code, path, paths))
          items.push(...componentItems(registration, (file) => files.get(file)));
    } catch (error) {
      unread.push(`${path}: ${errorMessage(error)}`);
    }
  }
  const shopware = files.get(SHOPWARE_GLOBAL);
  if (shopware !== undefined) items.push(...globalItems(shopware, SHOPWARE_GLOBAL));
  return items;
}

function storefrontItems(files: Map<string, string>, unread: string[]): Item[] {
  const items: Item[] = [];
  for (const [path, code] of files) {
    if (!isStorefrontTemplate(path)) continue;
    items.push(...templateItems(code, path));
  }
  const main = files.get(STOREFRONT_MAIN);
  if (main === undefined) return items;
  try {
    for (const registration of pluginRegistrations(main, new Set(files.keys())))
      items.push(...pluginItems(registration, (file) => files.get(file)));
  } catch (error) {
    unread.push(`${STOREFRONT_MAIN}: ${errorMessage(error)}`);
  }
  return items;
}

/** Admin, storefront, Twig and build items. `php` holds the PHP files the
 *  build already read; `all` lists every file under `src/`. */
export function frontendItems(
  repo: string,
  ref: string,
  all: string[],
  php: Map<string, string>,
): { items: Item[]; unread: string[] } {
  const unread: string[] = [];
  const items = buildItems(all);
  for (const [path, code] of php) {
    if (code.includes('new TwigFunction(') || code.includes('new TwigFilter(') || code.includes('getTag()'))
      items.push(...twigItems(code, path));
  }
  const admin = all.filter((path) => isAdminSource(path));
  items.push(...adminItems(readFiles(repo, ref, admin), unread));
  const storefront = all.filter((path) => isStorefrontTemplate(path) || isStorefrontSource(path));
  items.push(...storefrontItems(readFiles(repo, ref, storefront), unread));
  return { items, unread };
}
