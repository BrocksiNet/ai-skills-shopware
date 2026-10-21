// Grader: di-tag-not-while-referenced
import { basename } from 'node:path';
import { fail, filesUnder, findFile, type Grader, hasLine, read, verdict } from '../src/grade/kit.ts';

export const grade: Grader = ({ workdir }) => {
  const xml = filesUnder(workdir).find((f) => basename(f) === 'services.xml');
  const php = findFile(workdir, 'LegacyCaller');
  if (xml === undefined || php === undefined) return fail('services.xml or LegacyCaller.php not found');
  const config = read(xml);
  const service = config.includes('swag.example.legacy_loader');
  const deprecated = hasLine(config, /deprecated=/u);
  // Core still injects the service; a leftover class name is not a reference.
  const ref = hasLine(config, /<argument[^>]*id="swag.example.legacy_loader"/u) && hasLine(read(php), /LegacyLoader/u);
  return verdict(service && !deprecated && ref, { service, deprecated, ref });
};
