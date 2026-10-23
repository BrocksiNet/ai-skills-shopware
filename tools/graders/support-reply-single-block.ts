// Grader: support-reply-single-block (sw-assistant-style)
// The reply must be one outer fenced block (copy-ready), with no nested fences,
// no em dashes, no AI filler, and it must name the cache as the cause.
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { countLines, fail, type Grader, hasLine, read, verdict } from '../src/grade/kit.ts';

const FENCE = /^(```|~~~)/u;

export const grade: Grader = ({ workdir }) => {
  const file = join(workdir, 'reply.md');
  const text = existsSync(file) ? read(file) : '';
  if (text === '') return fail('reply.md missing or empty');
  // Fence lines (``` or ~~~), ignoring blank lines around the block.
  const fences = countLines(text, /^\s*(```|~~~)/u);
  const lines = text.split('\n').filter((l) => !/^\s*$/u.test(l));
  const first = lines.at(0) ?? '';
  const last = lines.at(-1) ?? '';
  const singleBlock = fences === 2 && FENCE.test(first) && /^(```|~~~)\s*$/u.test(last);
  const emDash = text.includes('—');
  const filler = hasLine(
    text,
    /great question|i hope this helps|happy to help|feel free to reach out|don't hesitate|certainly!|absolutely!|delve/iu,
  );
  const cache = hasLine(text, /cache/iu);
  return verdict(singleBlock && !emDash && !filler && cache, {
    single_block: singleBlock,
    fences,
    em_dash: emDash,
    filler,
    cache,
  });
};
