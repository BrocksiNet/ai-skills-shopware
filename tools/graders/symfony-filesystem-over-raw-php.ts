// Grader: symfony-filesystem-over-raw-php
import { fail, findFile, flat, type Grader, hasLine, read, verdict } from '../src/grade/kit.ts';

export const grade: Grader = ({ workdir }) => {
  const file = findFile(workdir, 'SnippetDumper');
  if (file === undefined) return fail('SnippetDumper.php not found');
  const text = read(file);
  const component = text.includes(String.raw`use Symfony\Component\Filesystem\Filesystem`);
  const ctor = hasLine(flat(text), /function __construct\s*\([^)]*private readonly Filesystem \$filesystem/u);
  const receiver = hasLine(text, /\$this->filesystem->dumpFile\s*\(/u);
  const raw = hasLine(text, /file_put_contents\s*\(|\bmkdir\s*\(|\bunlink\s*\(/u);
  const usesNew = hasLine(text, /new\s+Filesystem\s*\(/u);
  return verdict(component && ctor && receiver && !raw && !usesNew, {
    component,
    ctor,
    receiver,
    raw,
    new: usesNew,
  });
};
