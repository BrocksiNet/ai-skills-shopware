#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const task = process.argv[2];
const workdir = process.env.WORKDIR;

if (!task) {
  console.error('usage: grade.mjs <task>');
  process.exit(2);
}

if (!workdir) {
  console.error('WORKDIR not set');
  process.exit(2);
}

const here = dirname(fileURLToPath(import.meta.url));
const modulesDir = join(here, '..', 'node_modules');
if (!existsSync(modulesDir)) {
  console.error('score=0 (ast tools not installed: cd evals/tools/ast && npm ci)');
  process.exit(2);
}

const taskFile = join(here, '..', 'src', 'tasks', `${task}.mjs`);
if (!existsSync(taskFile)) {
  console.log(`score=0 (unknown ast task: ${task})`);
  process.exit(1);
}

const { grade } = await import(taskFile);
let result;
try {
  result = grade({
    workdir,
    transcript: process.env.TRANSCRIPT ?? '',
  });
} catch {
  console.log('score=0 (grader_error)');
  process.exit(1);
}

const score = result?.score === 1 ? 1 : 0;
const detail = result?.detail ? ` (${result.detail})` : '';
console.log(`score=${score}${detail}`);
process.exit(score === 1 ? 0 : 1);
