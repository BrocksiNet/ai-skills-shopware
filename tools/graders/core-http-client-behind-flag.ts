// Grader: core-http-client-behind-flag
import { fail, findFile, type Grader, hasLine, read, verdict } from '../src/grade/kit.ts';

export const grade: Grader = ({ workdir }) => {
  const file = findFile(workdir, 'RemoteSnippetFetcher');
  if (file === undefined) return fail('RemoteSnippetFetcher.php not found');
  const text = read(file);
  const flag = hasLine(text, /Feature::isActive\s*\(/u);
  const httpClient = hasLine(text, /HttpClientInterface/u);
  const legacy = hasLine(text, /file_get_contents\s*\(/u);
  const construct = hasLine(text, /__construct/u);
  return verdict(flag && httpClient && legacy && construct, {
    flag,
    http_client: httpClient,
    legacy,
    construct,
  });
};
