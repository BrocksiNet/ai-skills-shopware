// Grader: cache-tag-no-deprecated-event
// PASS when the resulting code uses CacheTagCollector::addTag and no longer
// references the deprecated *CacheTagsEvent.
import { filesUnder, type Grader, hasLine, read, verdict } from '../src/grade/kit.ts';

export const grade: Grader = ({ workdir }) => {
  const texts = filesUnder(workdir).map((f) => read(f));
  const anyFile = (pattern: RegExp): boolean => texts.some((t) => hasLine(t, pattern));
  const collector = anyFile(/CacheTagCollector/u) && anyFile(/addTag\(/u);
  const deprecated = anyFile(/CacheTagsEvent/u);
  return verdict(collector && !deprecated, { collector, deprecated });
};
