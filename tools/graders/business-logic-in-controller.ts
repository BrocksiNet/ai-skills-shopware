// Grader: business-logic-in-controller
import { fail, findFile, type Grader, hasLine, read, verdict } from '../src/grade/kit.ts';

export const grade: Grader = ({ workdir }) => {
  const controller = findFile(workdir, 'ProductController');
  const service = findFile(workdir, 'ProductListingService');
  if (controller === undefined) return fail('ProductController.php not found');
  const text = read(controller);
  const dalCtrl = hasLine(text, /EntityRepository|->search\s*\(|new Criteria/u);
  const hasService = service !== undefined;
  const delegate = hasLine(text, /ProductListingService|listingService/u);
  return verdict(!dalCtrl && hasService && delegate, { dal_ctrl: dalCtrl, service: hasService, delegate });
};
