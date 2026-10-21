// Grader: cache-tag-no-deprecated-event
// PASS when the resulting code adds tags through CacheTagCollector::addTag
// (6.7.2+) or dispatches AddCacheTagEvent (6.7.0+), and no longer references
// the deprecated *CacheTagsEvent.
import { filesUnder, type Grader, hasLine, read, verdict } from '../src/grade/kit.ts';

export const grade: Grader = ({ workdir }) => {
  const texts = filesUnder(workdir).map((f) => read(f));
  const anyFile = (pattern: RegExp): boolean => texts.some((t) => hasLine(t, pattern));
  const collector = anyFile(/CacheTagCollector/u) && anyFile(/addTag\(/u);
  const addEvent = anyFile(/new\s+AddCacheTagEvent\(/u);
  const deprecated = anyFile(/CacheTagsEvent/u);
  return verdict((collector || addEvent) && !deprecated, { collector, add_event: addEvent, deprecated });
};
