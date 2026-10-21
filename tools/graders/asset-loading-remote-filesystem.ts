// Grader: asset-loading-remote-filesystem
// The subject is the review transcript, not a code edit.
import { fail, type Grader, hasLine, verdict } from '../src/grade/kit.ts';

export const grade: Grader = ({ transcript }) => {
  if (transcript === '') return fail('empty transcript');
  const text = transcript.toLowerCase();
  const remote = hasLine(text, /s3|remote filesystem|object storage/u);
  const localDisk = hasLine(text, /local/u);
  const hold = hasLine(text, /do not ship|narrow the design/u);
  const approves = hasLine(text, /ship it|lgtm/u);
  return verdict(remote && localDisk && hold && !approves, { remote, local: localDisk, hold, approves });
};
