// Grader: migration-timestamp-format
import { basename } from 'node:path';
import { fail, findFile, type Grader, hasLine, read, verdict } from '../src/grade/kit.ts';

const PLACEHOLDERS = new Set(['1234567890', '1600000000', '0000000000', '1111111111', '9999999999']);

export const grade: Grader = ({ workdir }) => {
  const file = findFile(workdir, 'AddInternalNoteColumn');
  if (file === undefined) return fail('migration class not found');
  const timestamp = /^Migration([0-9]{10})AddInternalNoteColumn$/u.exec(basename(file, '.php'))?.[1];
  if (timestamp === undefined) return fail('class name must be Migration<Timestamp>AddInternalNoteColumn');
  const placeholder = PLACEHOLDERS.has(timestamp);
  const matched = hasLine(read(file), new RegExp(String.raw`return\s+${timestamp}\s*;`, 'u'));
  return verdict(matched && !placeholder, {
    class: `Migration${timestamp}AddInternalNoteColumn`,
    ts: timestamp,
    matched,
    placeholder,
  });
};
