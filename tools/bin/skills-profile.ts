// SKILLS_PROFILE_CMD adapter. evals/runner/skills-profile.sh is a wrapper for
// this file; tools/src/skills-profile.ts documents what on and off do.
//
//   node tools/bin/skills-profile.ts on|off <workdir> [task]
import { resolve } from 'node:path';
import { skillsProfile } from '../src/skills-profile.ts';

const [mode, workdir, task = '', ...rest] = process.argv.slice(2);
if (!mode || !workdir || rest.length > 0) {
  console.error('usage: skills-profile.sh on|off <workdir> [task]');
  process.exit(2);
}
const error = skillsProfile(resolve(import.meta.dirname, '../..'), mode, workdir, task);
if (error !== null) {
  console.error(error);
  process.exit(2);
}
