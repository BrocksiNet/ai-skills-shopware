import { lastJsonBlock } from '../findings.ts';
import { errorMessage } from '../errors.ts';
import { fail, type Grader, verdict } from './kit.ts';

/** Grade the user's selected workflow, without requiring internal rule IDs. */
export const discovery =
  (required: string[], forbidden: string[]): Grader =>
  ({ transcript }) => {
    try {
      const block = lastJsonBlock(transcript);
      if (block === undefined) return fail('no fenced json selection');
      const v: unknown = JSON.parse(block);
      if (
        typeof v !== 'object' ||
        v === null ||
        !('skills' in v) ||
        !Array.isArray(v.skills) ||
        !v.skills.every((s: unknown) => typeof s === 'string')
      )
        return fail('skills must be a string list');
      const selected: unknown[] = v.skills;
      return verdict(
        required.every((s) => selected.includes(s)) &&
          !forbidden.some((s) => selected.includes(s)) &&
          selected.length <= 8,
        { selection: selected.join(',') },
      );
    } catch (error) {
      return fail(errorMessage(error));
    }
  };
