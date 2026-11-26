// Grader: migration-timestamp-format
// PASS when the file name, class declaration, and getCreationTimestamp() return
// value share the same 10-digit non-placeholder timestamp (comments stripped).
import { basename } from 'node:path';
import { fail, findFile, type Grader, hasLine, phpMethod, read, stripComments, verdict } from '../src/grade/kit.ts';

const PLACEHOLDERS = new Set(['1234567890', '1600000000', '0000000000', '1111111111', '9999999999']);

export const grade: Grader = ({ workdir }) => {
  const file = findFile(workdir, 'AddInternalNoteColumn');
  if (file === undefined) return fail('migration class not found');
  const timestamp = /^Migration([0-9]{10})AddInternalNoteColumn$/u.exec(basename(file, '.php'))?.[1];
  if (timestamp === undefined) return fail('class name must be Migration<Timestamp>AddInternalNoteColumn');
  const placeholder = PLACEHOLDERS.has(timestamp);
  const raw = read(file);
  const classMatched = hasLine(
    stripComments(raw),
    new RegExp(String.raw`\bclass\s+Migration${timestamp}AddInternalNoteColumn\b`, 'u'),
  );
  const method = phpMethod(raw, 'getCreationTimestamp');
  const matched = hasLine(method, new RegExp(String.raw`\breturn\s+${timestamp}\s*;`, 'u'));
  return verdict(classMatched && matched && !placeholder, {
    class: `Migration${timestamp}AddInternalNoteColumn`,
    ts: timestamp,
    class_matched: classMatched,
    matched,
    placeholder,
  });
};
