// Grader: interface-di-repository
import { fail, findFile, type Grader, hasLine, read, verdict } from '../src/grade/kit.ts';

export const grade: Grader = ({ workdir }) => {
  const file = findFile(workdir, 'ProductReader');
  if (file === undefined) return fail('ProductReader.php not found');
  const text = read(file);
  const usesInterface = hasLine(text, /ProductRepositoryInterface|EntityRepositoryInterface/u);
  const concrete = hasLine(text, /EntityRepository/u) && !usesInterface;
  return verdict(usesInterface && !concrete, { interface: usesInterface, concrete_entity_repository: concrete });
};
