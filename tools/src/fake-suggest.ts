// The fake agent's answer to a `suggest-rules` question
// (FAKE_AGENT_MODE=suggest). It reads the prompt and answers by
// FAKE_SUGGEST:
//
//   none         (default) the cluster is covered by its first rule
//   new          a new rule citing every signal URL in the prompt
//   foreign-url  a new rule citing a URL that is not in the prompt
//   retire       retire the first rule, citing the retirement evidence ID
//   bad-json     prose, no JSON
//   bad-schema   JSON that misses most fields
import { envOr } from './env.ts';

export const FOREIGN_URL = 'https://github.com/shopware/shopware/pull/999999#discussion_r999999';

const criteria = {
  delta: 'fake',
  frequency: 'fake',
  single_home: 'fake',
  testable: 'fake',
};

/** The answer text, or undefined for an unknown FAKE_SUGGEST. */
export function fakeSuggest(prompt: string, env: NodeJS.ProcessEnv): string | undefined {
  const urls = [...prompt.matchAll(/"url": "([^"]+)"/gu)].map((m) => m[1] ?? '');
  const skill = /^Cluster: (?:retire:[a-z]+:[A-Z]+-[0-9]+|(sw-[a-z0-9-]+))/mu.exec(prompt)?.[1];
  const owner = skill ?? /^- (sw-[a-z0-9-]+): /mu.exec(prompt)?.[1] ?? 'sw-review-learnings';
  const rule = /^- ([A-Z]+-[0-9]{3}) \(/mu.exec(prompt)?.[1] ?? '';
  const evidenceId = /\(evidence ID ([^)]+)\)/u.exec(prompt)?.[1];
  const base = { skill: owner, title: 'Fake proposal', criteria, draft: '' };
  const mode = envOr(env, 'FAKE_SUGGEST', 'none');
  switch (mode) {
    case 'none':
      return JSON.stringify([
        {
          ...base,
          action: 'none',
          rule,
          evidence: evidenceId === undefined ? urls.slice(0, 1) : [evidenceId],
          reason: 'covered',
        },
      ]);
    case 'new':
    case 'foreign-url':
      return `\`\`\`json\n${JSON.stringify({
        ...base,
        action: 'new',
        rule: '',
        evidence: mode === 'new' ? urls : [...urls.slice(0, 1), FOREIGN_URL],
        draft: 'Fake rule text.',
        eval: { kind: 'review-pair', catch: 'a diff with it', ignore: 'a diff without it' },
      })}\n\`\`\`\n`;
    case 'retire':
      return JSON.stringify([{ ...base, action: 'retire', rule, evidence: [evidenceId ?? ''], reason: 'enforced' }]);
    case 'bad-json':
      return 'I think this cluster is fine.';
    case 'bad-schema':
      return '[{"action": "maybe"}]';
    default:
      return undefined;
  }
}
