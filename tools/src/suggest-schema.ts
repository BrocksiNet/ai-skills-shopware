// The answer the agent gives per cluster in `suggest-rules` (plan WP12
// step 4): one or more proposals in the shape below. The agent's text is
// untrusted, so it is parsed to `unknown` and checked field by field.
import { errorMessage } from './errors.ts';

export const ACTIONS = ['new', 'update', 'retire', 'none'] as const;
export type Action = (typeof ACTIONS)[number];

export const EVAL_KINDS = ['review-pair', 'task'] as const;
export type EvalKind = (typeof EVAL_KINDS)[number];

export const CRITERIA = ['delta', 'frequency', 'single_home', 'testable'] as const;
export type Criterion = (typeof CRITERIA)[number];

export interface Proposal {
  action: Action;
  skill: string;
  /** Existing rule ID for update, retire and none; empty for a new rule. */
  rule: string;
  title: string;
  /** URLs of the signals the proposal rests on. */
  evidence: string[];
  criteria: Record<Criterion, string>;
  /** One paragraph of rule text in our words; empty for none and retire. */
  draft: string;
  eval?: { kind: EvalKind; catch: string; ignore: string };
  /** Why, in a sentence: what covers the cluster for none, why it goes for retire. */
  reason?: string;
}

/** Shown to the agent: the shape the answer must have. */
export const ANSWER_SCHEMA = {
  type: 'array',
  maxItems: 3,
  items: {
    type: 'object',
    required: ['action', 'skill', 'rule', 'title', 'evidence', 'criteria', 'draft'],
    properties: {
      action: { enum: ACTIONS },
      skill: { type: 'string', pattern: '^sw-[a-z0-9-]+$' },
      rule: { type: 'string', description: 'existing rule ID for update, retire and none; "" for new' },
      title: { type: 'string' },
      evidence: { type: 'array', minItems: 1, items: { type: 'string', description: 'a url from the signals' } },
      criteria: {
        type: 'object',
        required: CRITERIA,
        properties: Object.fromEntries(CRITERIA.map((c) => [c, { type: 'string' }])),
      },
      draft: { type: 'string', description: 'one paragraph of rule text in our words; "" for none and retire' },
      eval: {
        type: 'object',
        required: ['kind', 'catch', 'ignore'],
        properties: { kind: { enum: EVAL_KINDS }, catch: { type: 'string' }, ignore: { type: 'string' } },
      },
      reason: { type: 'string' },
    },
  },
} as const;

type Json = Record<string, unknown>;
const isRecord = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v);
const isString = (v: unknown): v is string => typeof v === 'string';
const oneOf = <T extends string>(list: readonly T[], v: unknown): v is T => list.some((item) => item === v);
const RULE_ID = /^[A-Z]+-[0-9]{3}$/u;

/** Schema errors of one proposal; empty when it is valid. */
export function proposalErrors(v: unknown): string[] {
  if (!isRecord(v)) return ['a proposal must be an object'];
  const errors: string[] = [];
  if (!oneOf(ACTIONS, v.action)) errors.push(`action must be one of ${ACTIONS.join(', ')}`);
  if (!isString(v.skill) || !/^sw-[a-z0-9-]+$/u.test(v.skill)) errors.push('skill must be a skill name (sw-…)');
  if (!isString(v.rule)) errors.push('rule must be a string');
  else if (v.rule !== '' && !RULE_ID.test(v.rule)) errors.push(`rule ${v.rule} is not a rule ID`);
  else if (v.action === 'new' && v.rule !== '') errors.push('a new rule has rule ""');
  else if (v.action !== 'new' && v.action !== 'none' && v.rule === '') errors.push(`${String(v.action)} needs a rule`);
  if (!isString(v.title) || v.title.trim() === '') errors.push('title must be a non-empty string');
  if (!Array.isArray(v.evidence) || v.evidence.length === 0 || !v.evidence.every((e) => isString(e)))
    errors.push('evidence must be a non-empty list of URLs');
  const criteria = v.criteria;
  if (isRecord(criteria)) {
    for (const c of CRITERIA) if (!isString(criteria[c])) errors.push(`criteria.${c} must be a string`);
  } else {
    errors.push('criteria must be an object');
  }
  if (isString(v.draft)) {
    if ((v.action === 'new' || v.action === 'update') && v.draft.trim() === '')
      errors.push(`${v.action} needs a draft`);
  } else {
    errors.push('draft must be a string');
  }
  if (v.eval !== undefined) {
    const e = v.eval;
    if (!isRecord(e) || !oneOf(EVAL_KINDS, e.kind) || !isString(e.catch) || !isString(e.ignore))
      errors.push(`eval needs kind (${EVAL_KINDS.join(' or ')}), catch and ignore`);
  } else if (v.action === 'new') {
    errors.push('a new rule needs an eval');
  }
  if (v.reason !== undefined && !isString(v.reason)) errors.push('reason must be a string');
  return errors;
}

export const isProposal = (v: unknown): v is Proposal => proposalErrors(v).length === 0;

/** The first JSON value in the agent's text: a fenced block, or the text
 *  from the first `[` or `{` to its last match. */
function jsonIn(text: string): unknown {
  const fenced = /```(?:json)?\s*\n([\s\S]*?)\n\s*```/u.exec(text)?.[1];
  if (fenced !== undefined) return JSON.parse(fenced);
  const start = text.search(/[[{]/u);
  if (start < 0) throw new Error('no JSON in the answer');
  const close = text[start] === '[' ? ']' : '}';
  return JSON.parse(text.slice(start, text.lastIndexOf(close) + 1));
}

export interface ParsedAnswer {
  proposals: Proposal[];
  /** One entry per proposal that failed the schema, and parse errors. */
  errors: string[];
}

/** The proposals in an answer: a JSON object or a list of up to `max`. */
export function parseAnswer(text: string, max = 3): ParsedAnswer {
  let value: unknown;
  try {
    value = jsonIn(text);
  } catch (error) {
    return { proposals: [], errors: [`not JSON: ${errorMessage(error)}`] };
  }
  const list: unknown[] = Array.isArray(value) ? value : [value];
  const proposals: Proposal[] = [];
  const errors: string[] = [];
  if (list.length > max) errors.push(`${list.length} proposals, only the first ${max} kept`);
  for (const [i, item] of list.slice(0, max).entries()) {
    const problems = proposalErrors(item);
    if (problems.length === 0 && isProposal(item)) proposals.push(item);
    else errors.push(`proposal ${i + 1}: ${problems.join('; ')}`);
  }
  return { proposals, errors };
}
