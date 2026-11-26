// Grader: cache-tag-no-deprecated-event
// PASS when the resulting code adds tags through CacheTagCollector::addTag
// (6.7.2+) or dispatches AddCacheTagEvent (6.7.0+), and no longer references
// the deprecated *CacheTagsEvent (checked on comment-stripped code).
import { filesUnder, type Grader, hasLine, read, stripComments, verdict } from '../src/grade/kit.ts';

export const grade: Grader = ({ workdir }) => {
  const codes = filesUnder(workdir).map((f) => stripComments(read(f)));
  const collector = codes.some((c) => hasLine(c, /\bCacheTagCollector\b/u) && hasLine(c, /->addTag\s*\(/u));
  const addEvent = codes.some((c) =>
    hasLine(c, /new\s+\\?(?:Shopware\\Core\\Framework\\Adapter\\Cache\\Event\\)?AddCacheTagEvent\s*\(/u),
  );
  const deprecated = codes.some((c) => hasLine(c, /CacheTagsEvent/u));
  return verdict((collector || addEvent) && !deprecated, { collector, add_event: addEvent, deprecated });
};
