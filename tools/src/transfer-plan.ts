import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export interface TransferCase {
  task: string;
  expected_references: string[];
  outcome_kind: string;
}

export function transferCases(root: string, plan = 'evals/experiments/discovery-transfer-v1.json'): TransferCase[] {
  const raw: unknown = JSON.parse(readFileSync(join(root, plan), 'utf8'));
  if (
    typeof raw !== 'object' ||
    raw === null ||
    !('version' in raw) ||
    raw.version !== 1 ||
    !('cases' in raw) ||
    !Array.isArray(raw.cases)
  )
    throw new Error('invalid transfer plan');
  const items: unknown[] = raw.cases;
  const result = items.map((v) => {
    if (
      typeof v !== 'object' ||
      v === null ||
      !('task' in v) ||
      typeof v.task !== 'string' ||
      !/^transfer-[a-z0-9-]+$/u.test(v.task) ||
      !('expected_references' in v) ||
      !Array.isArray(v.expected_references) ||
      !('outcome_kind' in v) ||
      typeof v.outcome_kind !== 'string'
    )
      throw new Error('invalid transfer case');
    const refs: unknown[] = v.expected_references;
    const references = refs.filter(
      (r): r is string => typeof r === 'string' && /^sw-[a-z0-9-]+\/references\/[a-z0-9-]+\.md$/u.test(r),
    );
    if (
      references.length === 0 ||
      references.length !== refs.length ||
      references.some((r) => !existsSync(join(root, 'skills', r))) ||
      !existsSync(join(root, 'evals/tasks', v.task, 'grade.sh'))
    )
      throw new Error('transfer case has missing artifacts');
    return { task: v.task, expected_references: references, outcome_kind: v.outcome_kind };
  });
  if (result.length === 0 || new Set(result.map((r) => r.task)).size !== result.length)
    throw new Error('empty or duplicate transfer plan');
  return result;
}
