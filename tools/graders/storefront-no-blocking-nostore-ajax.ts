// Grader: storefront-no-blocking-nostore-ajax
import { basename } from 'node:path';
import { filesUnder, type Grader, hasLine, read, verdict } from '../src/grade/kit.ts';

const DOCUMENT_EXTS = ['.php', '.twig', '.html'];

export const grade: Grader = ({ workdir }) => {
  const files = filesUnder(workdir);
  const ctrl = files.find((f) => basename(f) === 'ListingPageController.php');
  let response = false;
  let documentNostore = false;
  if (ctrl !== undefined) {
    const text = read(ctrl);
    response = hasLine(text, /function\s+index\s*\(/u) && hasLine(text, /new\s+Response\s*\(/u);
    documentNostore = hasLine(text, /headers->set\s*\(\s*['"]Cache-Control['"]\s*,\s*['"][^'"]*no-store/u);
  }
  const js = files.filter((f) => f.endsWith('.js')).map((f) => read(f));
  const plugin = js.some((t) => hasLine(t, /extends Plugin/u));
  const fetch = js.some((t) => hasLine(t, /fetch\s*\(/u));
  const documents = files.filter((f) => DOCUMENT_EXTS.some((e) => f.endsWith(e))).map((f) => read(f));
  if (documents.some((t) => hasLine(t, /Cache-Control/u)) && documents.some((t) => hasLine(t, /no-store/u))) {
    documentNostore = true;
  }
  return verdict(ctrl !== undefined && response && plugin && fetch && !documentNostore, {
    controller: ctrl !== undefined,
    response,
    plugin,
    fetch,
    document_nostore: documentNostore,
  });
};
