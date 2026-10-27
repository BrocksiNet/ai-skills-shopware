// Machine-writing tells in prose, for graders of answers, replies and PR
// bodies (`STY-001`). The patterns follow blader/humanizer, itself based on
// Wikipedia's "Signs of AI writing"; only tells that justify an edit on one
// sighting count, so a careful human text scores zero.

/** Tell name -> pattern. Each match is one tell. */
const TELLS: Record<string, RegExp> = {
  dash: /[—–]|\s--\s/gu,
  not_x_but_y:
    /\bnot (?:just|only|merely)\b[^.\n]{0,80}\bbut\b|\bit'?s not\b[^.\n]{0,60}[,;]\s*it'?s\b|\bthis (?:does not|doesn't) mean\b/giu,
  closer: /\b(?:that is|that's) the (?:real )?(?:win|point)\b|\blet that sink in\b|\bthat distinction matters\b/giu,
  saying: /\bat its core\b|\bthe real (?:question|issue|problem) is\b|\bwhat really matters\b|\bthe heart of the\b/giu,
  run_up:
    /\blet'?s (?:dive|explore|break (?:it|this) down)\b|\bhere'?s (?:what you need to know|the thing)\b|\bwithout further ado\b|\bthe thing is\b/giu,
  strawman:
    /\bto be clear\b|\bi'?m not saying\b|\bdon'?t get me wrong\b|\bthis is not to say\b|\bone might be tempted\b/giu,
  inflation:
    /\bplays? an? (?:key|crucial|pivotal|vital) role\b|\bstands as\b|\bserves as\b|\bboasts\b|\b(?:delve|tapestry|testament|pivotal|seamless(?:ly)?)\b/giu,
  chatbot:
    /\bi hope this helps\b|\bgreat question\b|\bcertainly!|\babsolutely!|\bfeel free to\b|\bdon'?t hesitate\b|\bhappy to help\b|\bhope that helps\b/giu,
  emoji: /\p{Extended_Pictographic}/gu,
};

/** A list item that opens with a bold label: `- **Speed:** ...`, `1. **PHP.** ...`. */
const BOLD_LABEL = /^\s*(?:[-*+]|\d+\.)\s+\*\*[^*\n]+?(?:[:.]\*\*|\*\*\s*:)/gmu;

/** The prose of a markdown text: one outer fence unwrapped, inner fences,
 *  inline code, HTML comments, headings and checklist lines removed. */
export function proseOf(markdown: string): string {
  let text = markdown.trim();
  const outer = /^(`{3,}|~{3,})[^\n]*\n([\s\S]*)\n\1\s*$/u.exec(text);
  if (outer !== null) text = outer[2] ?? '';
  return text
    .replaceAll(/<!--[\s\S]*?-->/gu, '')
    .replaceAll(/^(`{3,}|~{3,})[^\n]*\n[\s\S]*?^\1\s*$/gmu, '')
    .replaceAll(/`[^`\n]*`/gu, 'CODE')
    .split('\n')
    .filter((l) => !/^\s*#/u.test(l) && !/^\s*[-*]\s+\[[ xX]\]/u.test(l))
    .join('\n');
}

/** Tell name -> count, only the tells found. Two or more bold-label list
 *  items count as one `bold_labels` tell per item; a single one is a choice. */
export function proseTells(markdown: string): Record<string, number> {
  const text = proseOf(markdown);
  const found: Record<string, number> = {};
  for (const [name, pattern] of Object.entries(TELLS)) {
    const n = (text.match(pattern) ?? []).length;
    if (n > 0) found[name] = n;
  }
  const labels = (text.match(BOLD_LABEL) ?? []).length;
  if (labels >= 2) found.bold_labels = labels;
  return found;
}

/** The tells as a detail value: `dash:2,chatbot:1`, or `none`. */
export const tellList = (tells: Record<string, number>): string =>
  Object.entries(tells)
    .map(([k, v]) => `${k}:${v}`)
    .join(',') || 'none';
