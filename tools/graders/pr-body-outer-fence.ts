// Grader: pr-body-outer-fence (PRD-002)
// Pass: the filled PR body sits in one outer fenced block that is longer than
// the code fences inside it, the block closes, and it holds the five sections
// and at least one code fence. Blocks are parsed like a markdown renderer does:
// a closing fence must be at least as long as the opener and carry no info.
import { fail, type Grader, verdict } from '../src/grade/kit.ts';

const S1 = '### 1. What and why?';
const S2 = '### 2. How?';
const S3 = '### 3. Testing';
const S4 = '### 4. Additional notes';
const S5 = '### 5. Checklist';

const OPEN = /^(`{3,})[^`]*$/u;
const CLOSE = /^(`{3,})[ \t]*$/u;
const CODE = /^```[\w-]+/u;

interface Block {
  fence: number;
  closed: boolean;
  lines: string[];
}

/** The top-level fenced blocks of a reply, in order. */
function blocks(text: string): Block[] {
  const found: Block[] = [];
  let open: Block | undefined;
  for (const line of text.split('\n')) {
    if (open === undefined) {
      const m = OPEN.exec(line);
      if (m !== null) open = { fence: (m[1] ?? '').length, closed: false, lines: [] };
      continue;
    }
    const m = CLOSE.exec(line);
    if (m !== null && (m[1] ?? '').length >= open.fence) {
      open.closed = true;
      found.push(open);
      open = undefined;
    } else {
      open.lines.push(line);
    }
  }
  if (open !== undefined) found.push(open);
  return found;
}

export const grade: Grader = ({ transcript }) => {
  if (transcript === '') return fail('empty transcript');
  const body = blocks(transcript).find((b) => b.lines.includes(S1));
  if (body === undefined) return fail('no fenced block holds the PR body');
  const outer = body.closed && body.fence >= 4;
  const sections = [S1, S2, S3, S4, S5].every((h) => body.lines.includes(h));
  const code = body.lines.some((l) => CODE.test(l));
  return verdict(outer && sections && code, { outer, sections, code });
};
