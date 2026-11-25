// MCP extension points: PHP attributes, interfaces, abstract tool base classes,
// extension traits under `*/Mcp/*`, and the DI service tags plugins and bundles
// use to register MCP tools, prompts, resources, and resource templates.
import type { Flags, Item } from './model.ts';
import { child, children, classFqcn, flag, nameOf, type Node, text } from './node.ts';
import { attributes, flagsOf, phpClasses, typeText } from './php.ts';
import type { Scope } from './php-scope.ts';
import type { Use } from './uses-context.ts';

const MCP_DIR = /(?:^|\/)Mcp\//u;
const MCP_CONFIG_FILE = /(?:^|\/)Resources\/config\/[^/]+\.(?:xml|php)$/u;
const MCP_TAG_NAME =
  /^(?:shopware\.(?:store_api_)?mcp\.(?:tool|prompt|resource)|mcp\.(?:tool|prompt|resource|resource_template|loader))$/u;

const TAG_PAIR = /'(shopware\.(?:store_api_)?mcp\.(?:tool|prompt|resource))'\s*=>\s*'(mcp\.[a-z_]+)'/gu;
const SDK_TAG = /'(mcp\.(?:tool|prompt|resource|resource_template|loader))'/gu;
const XML_TAG = /<tag\b[^>]*\bname=["']([^"']+)["']/gu;
const PHP_TAG = /->tag\(\s*['"]([^'"]+)['"]/gu;

function paramText(param: Node, scope: Scope): string {
  const type = typeText(child(param, 'type'), flag(param, 'nullable'), scope);
  const variadic = flag(param, 'variadic') ? '...' : '';
  const value = child(param, 'value') === undefined ? '' : ' = …';
  return `${type === '' ? '' : `${type} `}${variadic}$${nameOf(param) ?? ''}${value}`;
}

function methodSignature(method: Node, scope: Scope): string {
  const params = children(method, 'arguments').map((param) => paramText(param, scope));
  const returns = typeText(child(method, 'type'), flag(method, 'nullable'), scope);
  return `(${params.join(', ')})${returns === '' ? '' : `: ${returns}`}`;
}

function publicMethods(node: Node, scope: Scope): string[] {
  return children(node, 'body')
    .filter((member) => member.kind === 'method' && text(member, 'visibility') !== 'private')
    .map((member) => `${nameOf(member) ?? ''}${methodSignature(member, scope)}`)
    .toSorted();
}

function constructorSignature(node: Node, scope: Scope): string {
  const ctor = children(node, 'body').find((member) => member.kind === 'method' && nameOf(member) === '__construct');
  return ctor === undefined ? '()' : methodSignature(ctor, scope);
}

function isAttributeClass(node: Node, scope: Scope): boolean {
  return attributes(node, scope).some((attr) => attr.name === 'Attribute' || attr.name === '\\Attribute');
}

function phpMcpPoint(node: Node, scope: Scope, file: string): Item | undefined {
  const fqcn = classFqcn(node, scope.namespace);
  if (fqcn === undefined) return undefined;
  const flags = flagsOf(node, scope, flag(node, 'isFinal'));
  if (flags.internal === true) return undefined;
  if (node.kind === 'interface') {
    const methods = publicMethods(node, scope).join('; ');
    return {
      id: `mcp:interface:${fqcn}`,
      kind: 'mcp',
      file,
      signature: methods === '' ? 'interface' : `interface ${methods}`,
      flags,
    };
  }
  if (node.kind === 'trait') {
    return { id: `mcp:trait:${fqcn}`, kind: 'mcp', file, signature: 'trait', flags };
  }
  if (node.kind !== 'class') return undefined;
  if (isAttributeClass(node, scope)) {
    return {
      id: `mcp:attribute:${fqcn}`,
      kind: 'mcp',
      file,
      signature: `attribute ${constructorSignature(node, scope)}`,
      flags,
    };
  }
  if (flag(node, 'isAbstract')) {
    return { id: `mcp:base:${fqcn}`, kind: 'mcp', file, abstract: true, signature: 'abstract class', flags };
  }
  return undefined;
}

function deprecatedNear(code: string, index: number): Flags {
  const before = code
    .slice(Math.max(0, index - 240), index)
    .split('\n')
    .slice(-4)
    .join('\n');
  const note = /@deprecated\b([^\n]*)/u.exec(before)?.[1];
  if (note === undefined) return {};
  const parts = /tag:v?(\d+)\.(\d+)\.(\d+)/u.exec(note);
  return { deprecated: parts === null ? '' : `v${parts[1]}.${parts[2]}.${parts[3]}` };
}

function scopeForTag(tag: string): 'admin' | 'store-api' {
  return tag.startsWith('shopware.store_api_mcp.') ? 'store-api' : 'admin';
}

function tagItemsFromFile(code: string, file: string, seen: Set<string>): Item[] {
  const out: Item[] = [];
  const add = (tag: string, signature: string, index: number): void => {
    if (seen.has(tag)) return;
    seen.add(tag);
    out.push({
      id: `mcp:tag:${tag}`,
      kind: 'mcp',
      file,
      scope: scopeForTag(tag),
      signature,
      flags: deprecatedNear(code, index),
    });
  };
  if (file.endsWith('McpToolDiscoveryCompilerPass.php')) {
    for (const match of code.matchAll(TAG_PAIR)) {
      const [, source = '', target = ''] = match;
      add(source, `tag -> ${target}`, match.index);
    }
    for (const match of code.matchAll(SDK_TAG)) add(match[1] ?? '', 'sdk tag', match.index);
  } else if (file.endsWith('DependencyInjection/mcp.php')) {
    for (const match of code.matchAll(PHP_TAG)) {
      const tag = match[1] ?? '';
      if (MCP_TAG_NAME.test(tag)) add(tag, 'sdk tag', match.index);
    }
  }
  return out;
}

/** MCP extension points (attributes, interfaces, base classes, traits, and DI tags). */
export function mcpItems(files: ReadonlyMap<string, string>): Item[] {
  const items: Item[] = [];
  const seenTags = new Set<string>();
  const ordered = [...files.entries()].toSorted(([a], [b]) => {
    const passA = Number(a.endsWith('McpToolDiscoveryCompilerPass.php'));
    const passB = Number(b.endsWith('McpToolDiscoveryCompilerPass.php'));
    return passB - passA || (a < b ? -1 : a > b ? 1 : 0);
  });
  for (const [file, code] of ordered) {
    if (file.endsWith('McpToolDiscoveryCompilerPass.php') || file.endsWith('DependencyInjection/mcp.php')) {
      items.push(...tagItemsFromFile(code, file, seenTags));
    }
    if (!MCP_DIR.test(file)) continue;
    try {
      for (const { node, scope } of phpClasses(code, file)) {
        const point = phpMcpPoint(node, scope, file);
        if (point !== undefined) items.push(point);
      }
    } catch {
      // The PHP pass reports the file as failed.
    }
  }
  return items;
}

/** How an MCP extension point changed between two snapshots. */
export function mcpChange(base: Item, head: Item): string | undefined {
  const notes: string[] = [];
  if (base.signature !== head.signature) notes.push(`signature ${base.signature ?? '-'} → ${head.signature ?? '-'}`);
  if (base.scope !== head.scope) notes.push(`scope ${base.scope ?? '-'} → ${head.scope ?? '-'}`);
  return notes.length === 0 ? undefined : notes.join(', ');
}

/** True for plugin/extension DI config files that may declare MCP service tags. */
export function isMcpConfigFile(path: string): boolean {
  return MCP_CONFIG_FILE.test(path);
}

function lineNumberAt(textContent: string, offset: number): number {
  let line = 1;
  for (let i = 0; i < offset; i += 1) if (textContent[i] === '\n') line += 1;
  return line;
}

/** MCP service tags referenced in a plugin's XML or PHP DI configuration file. */
export function mcpUses(file: string, content: string): Use[] {
  const pattern = file.endsWith('.xml') ? XML_TAG : PHP_TAG;
  const uses: Use[] = [];
  for (const match of content.matchAll(pattern)) {
    const tag = match[1] ?? '';
    if (!MCP_TAG_NAME.test(tag)) continue;
    uses.push({ target: `mcp:tag:${tag}`, how: 'mcp-tag', file, line: lineNumberAt(content, match.index) });
  }
  return uses;
}
