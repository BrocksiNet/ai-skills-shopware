// Grader: pr-no-ai-trailers
import { basename } from 'node:path';
import { fail, filesUnder, type Grader, hasLine, read, verdict } from '../src/grade/kit.ts';

export const grade: Grader = ({ workdir }) => {
  const file = filesUnder(workdir).find((f) => basename(f) === 'pr-body.md');
  if (file === undefined) return fail('pr-body.md not found');
  const text = read(file);
  const has = (s: string): boolean => text.includes(s);
  const flags = {
    trailer: hasLine(text, /Co-authored-by|Co-committed-by|Signed-off-by/u),
    s1: has('### 1. Why is this change necessary?'),
    s2: has('### 2. What does this change do, exactly?'),
    s3: has('### 3. Describe each step to reproduce the issue or behaviour.'),
    s4: has('### 4. Please link to the relevant issues (if any).'),
    s5: has('### 5. Checklist'),
    why: has('cannot be decorated by plugins today'),
    what: has('Make CartProcessor extensible so plugins can decorate cart calculation'),
    repro: has('The decoration is ignored'),
    issue: has('relates #12345'),
    check: has('I have written tests and verified that they fail without my change'),
  };
  const { trailer, ...required } = flags;
  return verdict(!trailer && Object.values(required).every(Boolean), flags);
};
