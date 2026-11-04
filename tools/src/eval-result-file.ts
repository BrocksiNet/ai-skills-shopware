import { existsSync, readFileSync } from 'node:fs';
import { parseResults, type AbResult } from './eval-results.ts';

export const readResults = (path: string): AbResult[] =>
  existsSync(path) ? parseResults(readFileSync(path, 'utf8')) : [];
