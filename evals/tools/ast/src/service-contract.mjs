import { AssertionError } from 'node:assert';
import { phpClass } from './fact-php.mjs';

// Evaluate only the subject file, never a matching comment or leftover class.
export function serviceContract(workdir, name, check) {
  try {
    check(phpClass(workdir, `${name}.php`, name));
    return { score: 1, detail: `${name} contract preserved` };
  } catch (error) {
    if (error instanceof AssertionError) return { score: 0, detail: error.message.replace(/\s+/g, ' ') };
    throw error;
  }
}
