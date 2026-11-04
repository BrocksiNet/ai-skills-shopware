// Hidden assertions for prospective transfer tasks. Candidate JS executes in a
// VM with a small Shopware fixture adapter; PHP is checked structurally.
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve, relative } from 'node:path';
import { createContext, SourceTextModule } from 'node:vm';
import { parsePhp, findClass, findMethod, walkPhp, nodeName } from './php.mjs';

const STOREFRONT = 'src/Resources/app/storefront/src';
const BASE = `export default class Plugin {
  constructor(options = {}) {
    this.options = {...this.constructor.options, ...options};
    this.el = {innerHTML: 'original', dataset: {}};
  }
  destroy() {}
}`;

function fixtureVm(workdir, extras = {}) {
  const registrations = [];
  const context = createContext({console: {warn() {}, error() {}, log() {}}, AbortController, setTimeout, clearTimeout,
    window: {PluginManager: {register(...args) {registrations.push(args);}}}, ...extras});
  const modules = new Map();
  const module = (filename, source) => {
    if (!modules.has(filename)) modules.set(filename, new SourceTextModule(source, {context, identifier: filename}));
    return modules.get(filename);
  };
  const linker = (specifier, parent) => {
    if (specifier === 'src/plugin-system/plugin.class') return module('fixture:Plugin', BASE);
    assert.ok(specifier.startsWith('.'), `unexpected external dependency: ${specifier}`);
    let filename = resolve(dirname(parent.identifier), specifier);
    if (!existsSync(filename) && existsSync(`${filename}.js`)) filename += '.js';
    assert.ok(!relative(workdir, filename).startsWith('..'), 'module left fixture');
    return module(filename, readFileSync(filename, 'utf8'));
  };
  return {registrations, async load(path) {
    const filename = resolve(workdir, path);
    const result = module(filename, readFileSync(filename, 'utf8'));
    if (result.status === 'unlinked') await result.link(linker);
    if (result.status === 'linked') await result.evaluate({timeout: 2000});
    return result.namespace;
  }};
}

async function optionRename(workdir) {
  const vm = fixtureVm(workdir);
  const Plugin = (await vm.load(`${STOREFRONT}/plugin/delivery-note.plugin.js`)).default;
  for (const [options, expected] of [ [{}, 15], [{legacySurcharge: 7}, 17], [{legacySurcharge: 0}, 10],
    [{handlingFee: 2, legacySurcharge: 7}, 12], [{handlingFee: 0, legacySurcharge: 7}, 10] ]) {
    const plugin = new Plugin(options);
    if (typeof plugin.init === 'function') await plugin.init();
    assert.equal(plugin.total(10), expected, `options ${JSON.stringify(options)}`);
  }
  await vm.load(`${STOREFRONT}/main.js`);
  assert.ok(vm.registrations.some(([name, , selector]) => name === 'DeliveryNote' && selector === '[data-delivery-note]'),
    'released registration must remain available');
}

async function overrideChain(workdir) {
  let definition;
  const vm = fixtureVm(workdir, {Shopware: {Component: {override(name, value) {
    assert.equal(name, 'sw-order-detail'); definition = value;
  }}}});
  await vm.load('src/Resources/app/administration/src/extension/order-delivery/index.js');
  const save = definition?.methods?.onSave;
  assert.equal(typeof save, 'function', 'onSave override must remain registered');
  const calls = [];
  let refreshed = 0;
  let finish;
  const core = new Promise((done) => {finish = done;});
  const receiver = {$super(method, ...args) {calls.push([method, ...args]); return core;},
    refreshDeliveryBadge() {refreshed++;}, orderRepository: {save() {throw new Error('bypassed inherited save');}}};
  const token = {id: 'save-token'};
  const pending = save.call(receiver, token, false);
  assert.equal(refreshed, 0, 'refresh must wait for inherited save');
  const value = {id: 'saved-order'}; finish(value);
  assert.equal(await pending, value, 'inherited return value must survive');
  assert.equal(calls.length, 1, 'call inherited save exactly once');
  assert.equal(calls[0][0], 'onSave'); assert.equal(calls[0][1], token); assert.equal(calls[0][2], false);
  assert.equal(refreshed, 1);
  const failure = new Error('save rejected'); refreshed = 0;
  receiver.$super = () => Promise.reject(failure);
  await assert.rejects(async () => save.call(receiver, token), (error) => error === failure);
  assert.equal(refreshed, 0, 'do not refresh after rejected save');
}

function clearsMemo(method) {
  return method?.visibility === 'public' && (method.body?.children ?? []).some((statement) => {
    const node = statement.expression ?? statement;
    return node.kind === 'assign' && node.left?.kind === 'propertylookup' &&
      node.left.what?.kind === 'variable' && node.left.what.name === 'this' && nodeName(node.left.offset) === 'memo' &&
      node.right?.kind === 'array' && node.right.items.length === 0;
  });
}

const memoEntry = (node) => node?.kind === 'offsetlookup' && node.what?.kind === 'propertylookup' &&
  node.what.what?.kind === 'variable' && node.what.what.name === 'this' && nodeName(node.what.offset) === 'memo';

function preservesRate(method) {
  if ((method?.arguments ?? []).map((a) => nodeName(a.name)).join(',') !== 'channelId,currencyId') return false;
  const variables = new Map(); let stored = false; let returned = false; let conditional = false;
  const depends = (node, name, seen = new Set()) => {
    let found = false;
    walkPhp(node, (n) => {
      if (n.kind !== 'variable') return;
      if (n.name === name) found = true;
      else if (!seen.has(n.name) && variables.has(n.name)) {
        seen.add(n.name); found ||= depends(variables.get(n.name), name, seen);
      }
    });
    return found;
  };
  const completeKey = (n) => depends(n, 'channelId') && depends(n, 'currencyId');
  walkPhp(method?.body, (n) => {if (n.kind === 'assign' && n.left?.kind === 'variable') variables.set(n.left.name, n.right);});
  walkPhp(method?.body, (n) => {
    if (n.kind === 'assign' && memoEntry(n.left) && completeKey(n.left.offset)) {
      walkPhp(n.right, (call) => {
        if (call.kind !== 'call' || nodeName(call.what?.offset) !== 'load' ||
          nodeName(call.what?.what?.offset) !== 'rates') return;
        const args = call.arguments;
        stored ||= args.length === 2 && args.every((a, i) => {
          const expected = a.kind === 'namedargument' ? nodeName(a.name) : ['channelId', 'currencyId'][i];
          const value = a.kind === 'namedargument' ? a.value : a;
          return ['channelId', 'currencyId'].includes(expected) && value.kind === 'variable' && value.name === expected;
        });
      });
      conditional ||= n.operator === '??=';
    }
    if (n.kind === 'return') walkPhp(n.expr, (v) => {returned ||= memoEntry(v) && completeKey(v.offset);});
    if (n.kind === 'if') walkPhp(n.test, (v) => {conditional ||= memoEntry(v);});
  });
  return stored && returned && conditional;
}

function workerReset(workdir) {
  const source = readFileSync(resolve(workdir, 'src/Service/ChannelRateMemo.php'), 'utf8');
  const ast = parsePhp(source); const klass = findClass(ast, 'ChannelRateMemo');
  assert.ok(klass, 'expected service class');
  const imports = new Map();
  walkPhp(ast, (n) => {if (n.kind === 'useitem') imports.set(nodeName(n.alias) || n.name.split('\\').at(-1), n.name);});
  const hasReset = (klass.implements ?? []).some((n) => {
    const name = nodeName(n).replace(/^\\/u, '');
    return (imports.get(name) ?? name) === 'Symfony\\Contracts\\Service\\ResetInterface';
  });
  const xml = readFileSync(resolve(workdir, 'src/Resources/config/services.xml'), 'utf8');
  const services = [...xml.replace(/<!--[\s\S]*?-->/gu, '').matchAll(/<service\b([^>]*)(?:\/>|>([\s\S]*?)<\/service>)/gu)];
  const service = services.find((s) => /(?:id|class)=["']Swag\\Rates\\Service\\ChannelRateMemo["']/u.test(s[1]));
  assert.ok(service, 'service must remain registered');
  const tagged = /<tag\b(?=[^>]*name=["']kernel\.reset["'])(?=[^>]*method=["']([^"']+)["'])[^>]*\/?\s*>/u.exec(service[2] ?? '');
  const autoconfigured = /autoconfigure=["']true["']/u.test(service[1]) ||
    (/<defaults\b[^>]*autoconfigure=["']true["']/u.test(xml) && !/autoconfigure=["']false["']/u.test(service[1]));
  const method = findMethod(klass, hasReset && autoconfigured ? 'reset' : tagged?.[1] ?? '');
  assert.ok((hasReset && autoconfigured) || tagged, 'reset must be wired to the service lifecycle');
  assert.ok(clearsMemo(method), 'the wired public reset method must clear the owned memo');
  assert.ok(preservesRate(findMethod(klass, 'rate')), 'keep memoized provider results keyed by both rate inputs');
}

const outcomes = {'transfer-option-rename': optionRename, 'transfer-admin-save': overrideChain,
  'transfer-worker-reset': workerReset};
const [task, workdir] = process.argv.slice(2);
if (!Object.hasOwn(outcomes, task) || !workdir) {console.error('unknown transfer task or missing workdir'); process.exitCode = 2;}
else {
  try {await outcomes[task](resolve(workdir)); console.log(JSON.stringify({outcome: 'pass'}));}
  catch (error) {console.log(JSON.stringify({outcome: 'fail', reason: error.message})); process.exitCode = 1;}
}
