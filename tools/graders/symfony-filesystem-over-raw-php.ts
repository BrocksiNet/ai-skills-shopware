// Grader: symfony-filesystem-over-raw-php
import { fail, findFile, flat, type Grader, hasLine, read, verdict } from '../src/grade/kit.ts';

const FQCN = String.raw`\\?Symfony\\Component\\Filesystem\\Filesystem`;

export const grade: Grader = ({ workdir }) => {
  const file = findFile(workdir, 'SnippetDumper');
  if (file === undefined) return fail('SnippetDumper.php not found');
  const text = read(file);
  const imported = text.includes(String.raw`use Symfony\Component\Filesystem\Filesystem`);
  // A promoted constructor property of any name, short name with the import
  // or the fully qualified name, with `private readonly` in either order.
  const promoted = new RegExp(
    String.raw`function __construct\s*\([^)]*(?:private\s+readonly|readonly\s+private)\s+(Filesystem|${FQCN})\s+\$(\w+)`,
    'u',
  ).exec(flat(text));
  const type = promoted?.[1] ?? '';
  const component = type === 'Filesystem' ? imported : type !== '';
  const ctor = promoted !== null;
  const prop = promoted?.[2] ?? '';
  const receiver = prop !== '' && hasLine(text, new RegExp(String.raw`\$this->${prop}->dumpFile\s*\(`, 'u'));
  const raw = hasLine(text, /file_put_contents\s*\(|\bmkdir\s*\(|\bunlink\s*\(/u);
  const usesNew = hasLine(text, /new\s+\\?(?:Symfony\\Component\\Filesystem\\)?Filesystem\s*\(/u);
  return verdict(component && ctor && receiver && !raw && !usesNew, {
    component,
    ctor,
    receiver,
    raw,
    new: usesNew,
  });
};
