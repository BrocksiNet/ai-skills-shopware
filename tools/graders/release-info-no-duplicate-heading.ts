// Grader: release-info-no-duplicate-heading
import { basename } from 'node:path';
import { countLines, fail, filesUnder, type Grader, read, verdict } from '../src/grade/kit.ts';

const VERSION = /^# 6\.7\.4\.0\s*$/u;
const FEATURES = /^## Features\s*$/u;

/** CartProcessor appears under `## Features` of the 6.7.4.0 section. */
function newInFeatures(text: string): boolean {
  let inVersion = false;
  let inFeatures = false;
  for (const line of text.split('\n')) {
    if (VERSION.test(line)) {
      inVersion = true;
      continue;
    }
    if (line.startsWith('# ')) inVersion = false;
    if (inVersion && FEATURES.test(line)) {
      inFeatures = true;
      continue;
    }
    if (inVersion && line.startsWith('## ')) inFeatures = false;
    if (inVersion && inFeatures && line.includes('CartProcessor')) return true;
  }
  return false;
}

export const grade: Grader = ({ workdir }) => {
  const file = filesUnder(workdir).find((f) => basename(f) === 'RELEASE_INFO-6.7.md');
  if (file === undefined) return fail('RELEASE_INFO-6.7.md not found');
  const text = read(file);
  const versions = countLines(text, VERSION);
  const features = countLines(text, FEATURES);
  const existing = text.includes('ProductRoute');
  const inFeatures = newInFeatures(text);
  return verdict(versions === 1 && features === 1 && existing && inFeatures, {
    versions,
    features,
    existing,
    in_features: inFeatures,
  });
};
