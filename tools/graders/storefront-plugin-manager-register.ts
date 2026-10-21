// Grader: storefront-plugin-manager-register
import { existsSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fail, filesUnder, flat, type Grader, hasLine, read, verdict } from '../src/grade/kit.ts';

const REGISTER = /PluginManager\.register\s*\(\s*['"]ScrollHint['"][\s\S]*?import\s*\(\s*['"]([^'"]+)['"]/u;
const isFile = (path: string): boolean => existsSync(path) && statSync(path).isFile();

/** The ScrollHint module that main.js registers through a dynamic import. */
function pluginFile(mainJs: string): string | undefined {
  const spec = REGISTER.exec(read(mainJs))?.[1];
  if (spec === undefined || spec === '') return undefined;
  const rel = spec.replace(/^\.\//u, '');
  const candidate = join(dirname(mainJs), /\.(?:js|ts)$/u.test(rel) ? rel : `${rel}.js`);
  return isFile(candidate) ? candidate : undefined;
}

export const grade: Grader = ({ workdir }) => {
  const files = filesUnder(workdir);
  const js = files.filter((f) => f.endsWith('.js'));
  if (js.length === 0) return fail('no JS files');
  const mainJs = files.find((f) => f.endsWith('/storefront/src/main.js'));
  const plugin = mainJs === undefined ? undefined : pluginFile(mainJs);
  const jsFlat = flat(js.map((f) => read(f)).join(''));

  const windowRegister = hasLine(jsFlat, /window\.PluginManager\.register\s*\(/u);
  const dataSelector = hasLine(jsFlat, /PluginManager\.register\s*\(.*['"]\[data-scroll-hint\]['"]/u);
  const host = files.some((f) => /\.(?:twig|html)$/u.test(f) && hasLine(read(f), /data-scroll-hint/u));
  // Listeners must live on the registered ScrollHint plugin module; without
  // one, pluginText is empty and both checks fail.
  const pluginClass = plugin !== undefined;
  const pluginText = plugin === undefined ? '' : read(plugin);
  const listen = hasLine(pluginText, /window\.addEventListener\s*\(\s*['"]scroll['"]/u);
  const unlisten = hasLine(pluginText, /window\.removeEventListener\s*\(\s*['"]scroll['"]/u);
  const rawListener = hasLine(jsFlat, /document\.addEventListener\s*\(/u);

  const pass = windowRegister && dataSelector && host && listen && unlisten && pluginClass && !rawListener;
  return verdict(pass, {
    window_register: windowRegister,
    data_selector: dataSelector,
    host,
    listen,
    unlisten,
    plugin_class: pluginClass,
    raw_listener: rawListener,
  });
};
