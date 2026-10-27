// Grader: app-manifest-least-privilege (SEC-004)
// App manifest permissions name the entity per privilege element:
// `<read>product</read>`. The tightened manifest reads product and order,
// has no `all` entry and grants no create, update or delete.
import { basename } from 'node:path';
import { fail, filesUnder, type Grader, hasLine, read, verdict } from '../src/grade/kit.ts';

interface Permission {
  privilege: string;
  entity: string;
}

/** The entries of the manifest's <permissions> block, XML comments dropped. */
function permissions(xml: string): Permission[] | undefined {
  const code = xml.replaceAll(/<!--[\s\S]*?-->/gu, '');
  const block = /<permissions>([\s\S]*?)<\/permissions>/u.exec(code)?.[1];
  if (block === undefined) return undefined;
  const out: Permission[] = [];
  for (const m of block.matchAll(/<(\w+)>\s*([^<]*?)\s*<\/\1>/gu)) {
    const [, privilege, entity] = m;
    if (privilege !== undefined && entity !== undefined) out.push({ privilege, entity });
  }
  return out;
}

export const grade: Grader = ({ workdir }) => {
  const file = filesUnder(workdir).find((f) => basename(f) === 'manifest.xml' && hasLine(read(f), /./u));
  if (file === undefined) return fail('manifest.xml not found');
  const entries = permissions(read(file));
  if (entries === undefined) return fail('no <permissions> block in manifest.xml');
  const reads = (entity: string): boolean => entries.some((p) => p.privilege === 'read' && p.entity === entity);
  const wildcard = entries.some((p) => p.entity === 'all' || p.entity === '*');
  const writes = entries.some((p) => ['create', 'update', 'delete'].includes(p.privilege));
  const specific = reads('product') && reads('order');
  return verdict(!wildcard && !writes && specific, { wildcard, writes, specific });
};
