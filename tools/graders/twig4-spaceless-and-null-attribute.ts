// Grader: twig4-spaceless-and-null-attribute
// The subject is the review transcript, not a code edit.
import { fail, type Grader, hasLine, verdict } from '../src/grade/kit.ts';

export const grade: Grader = ({ transcript }) => {
  if (transcript === '') return fail('empty transcript');
  const text = transcript.toLowerCase();
  const spaceless = hasLine(
    text,
    /remove the spaceless|spaceless filter is gone|do not use spaceless|without the spaceless/u,
  );
  const nullAttr = hasLine(text, /null/u) && hasLine(text, /attributes\.remove|omit the attribute|omit it/u);
  const macroDefault = hasLine(text, /default/u);
  const wrong = hasLine(text, /apply spaceless|spaceless still/u);
  return verdict(spaceless && nullAttr && macroDefault && !wrong, {
    spaceless,
    null_attr: nullAttr,
    macro_default: macroDefault,
    wrong,
  });
};
