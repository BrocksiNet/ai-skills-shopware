import { readFileSync } from 'node:fs';
import { astHasIdentifier, parsePhp } from '../php.mjs';
import { findFiles, pathBasename } from '../files.mjs';

export function evaluateServicesPhp(ast) {
  if (!ast) {
    return { configurator: 0, loader: 0 };
  }
  return {
    configurator: astHasIdentifier(ast, 'ContainerConfigurator') ? 1 : 0,
    loader: astHasIdentifier(ast, 'ProductLoader') ? 1 : 0,
  };
}

export function grade({ workdir }) {
  const xmlFiles = findFiles(
    workdir,
    (path) => pathBasename(path) === 'services.xml',
  );
  const phpFiles = findFiles(
    workdir,
    (path) => pathBasename(path) === 'services.php',
  );

  const hasXml = xmlFiles.length > 0 ? 1 : 0;
  const hasPhp = phpFiles.length > 0 ? 1 : 0;

  let configurator = 0;
  let loader = 0;
  if (hasPhp === 1) {
    let source;
    try {
      source = readFileSync(phpFiles[0], 'utf8');
    } catch {
      return { score: 0, detail: 'read_error' };
    }
    const ast = parsePhp(source, phpFiles[0]);
    if (!ast) {
      return { score: 0, detail: 'parse_error' };
    }
    const parts = evaluateServicesPhp(ast);
    configurator = parts.configurator;
    loader = parts.loader;
  }

  const score = hasXml === 0 && hasPhp === 1 && configurator === 1 && loader === 1 ? 1 : 0;
  return {
    score,
    detail: `xml=${hasXml} php=${hasPhp} configurator=${configurator} loader=${loader}`,
  };
}
