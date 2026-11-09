// An extension's own code read for Shopware uses: its PHP with the use
// extractor, its admin, storefront and template files with the frontend
// reader, and the Shopware range its composer.json allows.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { frontendUses, isFrontendFile } from './frontend-uses.ts';
import { isNode } from './node.ts';
import { phpUses, type Use } from './uses.ts';

const SKIP_DIRS = new Set(['vendor', 'node_modules', '.git', 'tests', 'Tests', 'test', 'Test']);

/** PHP files, and the admin, storefront and template files the frontend reader wants. */
function sourceFiles(dir: string, root: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      if (!SKIP_DIRS.has(name)) out.push(...sourceFiles(path, root));
    } else if (name.endsWith('.php') || isFrontendFile(relative(root, path))) out.push(path);
  }
  return out;
}

/** `require.shopware/core` of the extension, if it has one. */
export function coreConstraint(dir: string): string | undefined {
  const path = join(dir, 'composer.json');
  if (!existsSync(path)) return undefined;
  const composer: unknown = JSON.parse(readFileSync(path, 'utf8'));
  if (!isNode(composer) || !isNode(composer.require)) return undefined;
  const core = composer.require['shopware/core'];
  return typeof core === 'string' ? core : undefined;
}

export interface Read {
  files: string[];
  failed: string[];
  uses: Use[];
  unresolved: number;
}

export function readExtension(dir: string): Read {
  // The extension's own code; tool and cache folders next to it are not.
  const root = existsSync(join(dir, 'src')) ? join(dir, 'src') : dir;
  const out: Read = { files: sourceFiles(root, dir), failed: [], uses: [], unresolved: 0 };
  const frontend = new Map<string, string>();
  for (const file of out.files) {
    if (!file.endsWith('.php')) {
      frontend.set(relative(dir, file), readFileSync(file, 'utf8'));
      continue;
    }
    try {
      const result = phpUses(readFileSync(file, 'utf8'), relative(dir, file));
      out.uses.push(...result.uses);
      out.unresolved += result.unresolved;
    } catch {
      out.failed.push(relative(dir, file));
    }
  }
  const result = frontendUses(frontend);
  out.uses.push(...result.uses);
  out.failed.push(...result.failed);
  return out;
}
