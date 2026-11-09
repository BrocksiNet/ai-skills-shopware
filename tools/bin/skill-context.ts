// How much context our skills take in your recent Claude Code sessions.
// Reads the transcripts under ~/.claude/projects (subagent transcripts
// included) and prints our share of all input tokens: the skill listing,
// invoked skill bodies, and skill files the agent read.
//
//   node tools/bin/skill-context.ts                 # last 14 days
//   node tools/bin/skill-context.ts --days 30 --json
//
// Eval runs live in temporary folders and are left out unless you pass
// --include-evals. Sizes are characters / 4, an estimate.
import { existsSync, readdirSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { stderr, stdout } from '../src/cli.ts';
import { formatReport, type Session, sessionRow } from '../src/skill-context-report.ts';
import { analyzeTranscript, type ContextReport, type IsOurs, ownershipTest, parseJsonl } from '../src/skill-context.ts';

// Skills core ships under the same name as an old name of ours.
const CORE_SKILLS = new Set(['shopware-admin-js']);

const realpath = (path: string): string => {
  try {
    return realpathSync(path);
  } catch {
    return path;
  }
};

function ownership(): IsOurs {
  const repo = resolve(import.meta.dirname, '../..');
  const current = new Set(readdirSync(join(repo, 'skills')));
  const aliases = new Set([...current].flatMap((s) => [s.replace(/^sw-/u, 'shopware-'), s.replace(/^sw-/u, '')]));
  return ownershipTest(current, aliases, {
    resolve: realpath,
    repoMarker: 'ai-skills-shopware',
    coreSkills: CORE_SKILLS,
  });
}

function readSession(dir: string, file: string, isOurs: IsOurs): ContextReport[] {
  const read = (p: string): ContextReport => analyzeTranscript(parseJsonl(readFileSync(p, 'utf8')), isOurs);
  const subagents = join(dir, basename(file, '.jsonl'), 'subagents');
  const subs = existsSync(subagents) ? readdirSync(subagents).filter((s) => s.endsWith('.jsonl')) : [];
  return [read(join(dir, file)), ...subs.map((s) => read(join(subagents, s)))];
}

function collect(root: string, since: number, includeEvals: boolean): Session[] {
  const isOurs = ownership();
  const sessions: Session[] = [];
  for (const project of readdirSync(root)) {
    const dir = join(root, project);
    if ((!includeEvals && project.includes('-private-var-folders-')) || !statSync(dir).isDirectory()) continue;
    const recent = readdirSync(dir).filter((f) => f.endsWith('.jsonl') && statSync(join(dir, f)).mtimeMs >= since);
    for (const file of recent) {
      sessions.push({
        project: project.replace(/^-Users-[^-]+-[^-]+-/u, ''),
        id: basename(file, '.jsonl'),
        contexts: readSession(dir, file, isOurs),
      });
    }
  }
  return sessions;
}

function main(): number {
  const { values } = parseArgs({
    options: {
      days: { type: 'string', default: '14' },
      root: { type: 'string', default: join(homedir(), '.claude/projects') },
      'include-evals': { type: 'boolean', default: false },
      json: { type: 'boolean', default: false },
    },
  });
  const days = Number(values.days);
  if (!Number.isFinite(days) || days <= 0) {
    stderr('--days must be a positive number\n');
    return 2;
  }
  const sessions = collect(values.root, Date.now() - days * 864e5, values['include-evals']);
  stdout(
    values.json
      ? `${JSON.stringify(
          sessions.map((s) => sessionRow(s)),
          null,
          2,
        )}\n`
      : formatReport(sessions, days),
  );
  return 0;
}

process.exitCode = main();
