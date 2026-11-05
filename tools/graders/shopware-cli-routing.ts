// Validate the actual runner/argv relationships, not explanatory prose.
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fail, type Grader, read, verdict } from '../src/grade/kit.ts';

const record = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
function row(v: unknown): v is { runner: string; commands: string[][] } {
  return (
    record(v) &&
    typeof v.runner === 'string' &&
    Array.isArray(v.commands) &&
    v.commands.every((a: unknown) => Array.isArray(a) && a.length > 0 && a.every((s: unknown) => typeof s === 'string'))
  );
}
const same = (a: string[], b: string[]): boolean => JSON.stringify(a) === JSON.stringify(b);
const reporter = (a: string[]): boolean =>
  a.some((v, i) => v === '--reporter=json' || (v === '--reporter' && a[i + 1] === 'json'));
function validation(a: string[], group: string, path?: string): boolean {
  if (!same(a.slice(0, 3), ['shopware-cli', group, 'validate']) || !reporter(a)) return false;
  const rest = a
    .slice(3)
    .filter(
      (v, i, args) => v !== '--reporter=json' && v !== '--reporter' && !(v === 'json' && args[i - 1] === '--reporter'),
    );
  return path === undefined ? rest.length === 0 : same(rest, [path]);
}
function managedCore(core: { runner: string; commands: string[][] }): boolean {
  const coreCommands = core.commands.map((a) => {
    if (!same(a.slice(0, 3), ['podman', 'compose', 'exec'])) return [];
    const command = a.slice(3);
    if (command[0] === '-T') command.shift();
    return command[0] === 'web' ? command.slice(1).map((v) => v.replace(/^\.\//u, '')) : [];
  });
  return (
    core.runner === 'podman' &&
    coreCommands.length === 2 &&
    coreCommands.some(
      (a) =>
        a[0] === 'vendor/bin/phpunit' &&
        (same(a.slice(1), ['--filter', 'CartProcessorTest']) || same(a.slice(1), ['--filter=CartProcessorTest'])),
    ) &&
    coreCommands.some(
      (a) =>
        same(a, ['composer', 'phpstan']) ||
        same(a, ['vendor/bin/phpstan', 'analyse']) ||
        same(a, ['vendor/bin/phpstan', 'analyze']),
    )
  );
}
export const grade: Grader = ({ workdir }) => {
  const path = join(workdir, 'validation-plan.json');
  if (!existsSync(path)) return fail('validation-plan.json missing');
  let data: unknown;
  try {
    data = JSON.parse(read(path));
  } catch {
    return fail('invalid JSON');
  }
  if (!record(data) || Object.keys(data).length !== 4) return fail('expected four workspace plans');
  const { core, shop, plugin, site } = data;
  if (!row(core) || !row(shop) || !row(plugin) || !row(site)) return fail('invalid runner/argv shape');
  const coreOk = managedCore(core);
  const shopOk =
    shop.runner === 'shopware-cli' &&
    shop.commands.length === 2 &&
    shop.commands.some((a) => validation(a, 'project')) &&
    shop.commands.some((a) => validation(a, 'extension', 'custom/plugins/Example'));
  const pluginOk =
    plugin.runner === 'shopware-cli' &&
    plugin.commands.length === 1 &&
    plugin.commands.every((a) => validation(a, 'extension', '.'));
  const siteOk =
    site.runner === 'project-native' &&
    site.commands.length === 1 &&
    site.commands.every((a) => same(a, ['npm', 'run', 'check']));
  return verdict(coreOk && shopOk && pluginOk && siteOk, {
    core: coreOk,
    shop: shopOk,
    plugin: pluginOk,
    unrelated: siteOk,
  });
};
