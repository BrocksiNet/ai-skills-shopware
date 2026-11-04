import { DISCOVERY_VARIANTS } from './discovery-pilot.ts';
import type { TransferCase } from './transfer-plan.ts';
import type { TransferTrial } from './transfer-trial.ts';

export function summarizeTransfer(cases: TransferCase[], trials: TransferTrial[]): object {
  const expected = new Map(cases.map((c) => [c.task, c.expected_references.length]));
  const variants = DISCOVERY_VARIANTS.map((variant) => {
    const all = trials.filter((t) => t.variant === variant);
    const graded = all.filter((t) => t.status === 'pass' || t.status === 'fail');
    const observable = graded.filter((t) => t.retrieval_observable);
    return {
      variant,
      planned_trials: all.length,
      graded: graded.length,
      passed: graded.filter((t) => t.status === 'pass').length,
      errors: all.filter((t) => t.status === 'error').length,
      skipped: all.filter((t) => t.status === 'skipped').length,
      capped: all.filter(
        (t) => t.termination?.some((s) => s === 'error_max_turns' || s === 'error_max_budget_usd') === true,
      ).length,
      cost_usd: all.reduce((n, t) => n + (t.cost_usd ?? 0), 0),
      retrieval_observable: observable.length,
      any_expected_reference_read: observable.filter((t) => t.required_references_read.length > 0).length,
      required_reference_hits: observable.reduce((n, t) => n + t.required_references_read.length, 0),
      required_reference_opportunities: observable.reduce((n, t) => n + (expected.get(t.task) ?? 0), 0),
      all_required_references_read: observable.filter((t) => t.required_references_read.length === expected.get(t.task))
        .length,
      other_reference_reads: observable.reduce((n, t) => n + t.other_references_read.length, 0),
      tokens_input: graded.reduce((n, t) => n + (t.tokens?.[0] ?? 0), 0),
      tokens_output: graded.reduce((n, t) => n + (t.tokens?.[1] ?? 0), 0),
      by_task: cases.map((c) => ({
        task: c.task,
        passed: graded.filter((t) => t.task === c.task && t.status === 'pass').length,
        graded: graded.filter((t) => t.task === c.task).length,
        required_reference_hits: observable
          .filter((t) => t.task === c.task)
          .reduce((n, t) => n + t.required_references_read.length, 0),
      })),
    };
  });
  return {
    purpose: 'Exploratory transfer comparison, not a statistical non-inferiority or retirement decision.',
    variants,
    reported_models: [...new Set(trials.flatMap((t) => t.reported_models))],
    interpretation:
      'Code success and reference retrieval are separate outcomes. Reference reads do not prove rule comprehension. Additional reference reads are not automatically wrong.',
  };
}
