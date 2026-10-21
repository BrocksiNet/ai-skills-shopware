// Grader: clock-interface-injection
import { fail, findFile, type Grader, hasLine, read, verdict } from '../src/grade/kit.ts';

export const grade: Grader = ({ workdir }) => {
  const file = findFile(workdir, 'TokenExpiryChecker');
  if (file === undefined) return fail('TokenExpiryChecker.php not found');
  const text = read(file);
  const usesClock = hasLine(text, /ClockInterface/u);
  const inject = usesClock && hasLine(text, /__construct|readonly\s+ClockInterface|ClockInterface\s+\$/u);
  const usesTime = hasLine(text, /\btime\s*\(/u) || hasLine(text, /\bdate\s*\(/u);
  return verdict(usesClock && inject && !usesTime, { clock: usesClock, inject, time_or_date: usesTime });
};
