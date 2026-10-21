// Grader: store-api-route-extension-event
import { fail, findFile, type Grader, read, stripComments, verdict } from '../src/grade/kit.ts';

export const grade: Grader = ({ workdir }) => {
  const file = findFile(workdir, 'class ProductBadgeRoute');
  if (file === undefined) return fail('ProductBadgeRoute.php not found');
  const body = stripComments(read(file));
  const abstract = body.includes('abstract class');
  const extension = body.includes('ExtensionDispatcher');
  return verdict(!abstract && extension, { abstract, extension });
};
