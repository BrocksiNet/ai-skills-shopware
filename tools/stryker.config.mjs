// Each command runs for EVERY mutant. Keep these offline decision suites bounded.
import { envOr } from './src/env.ts';

const profiles = {
  manifest: {
    mutate: ['tools/src/eval-manifest.ts'],
    tests: ['tools/test/eval-manifest.test.ts', 'tools/test/eval-results.test.ts'],
  },
  gate: {
    mutate: ['tools/src/eval-gate.ts'],
    tests: ['tools/test/eval-results.test.ts', 'tools/test/eval-manifest.test.ts'],
  },
  findings: {
    mutate: ['tools/src/findings.ts'],
    tests: ['tools/test/findings.test.ts', 'tools/test/review-graders.test.ts'],
  },
  constraints: { mutate: ['tools/api-index/src/constraint.ts'], tests: ['tools/api-index/test/constraint.test.ts'] },
  routing: {
    mutate: ['tools/src/routes.ts'],
    tests: ['tools/test/routes.test.ts', 'tools/test/route.test.ts', 'tools/test/route-borrow.test.ts'],
  },
};
const name = envOr(process.env, 'STRYKER_PROFILE', 'manifest');
if (!Object.hasOwn(profiles, name)) throw new Error(`unknown mutation profile: ${name}`);
const profile = profiles[name];
export default {
  mutate: profile.mutate,
  testRunner: 'command',
  commandRunner: { command: `node --test --test-concurrency=1 ${profile.tests.join(' ')}` },
  coverageAnalysis: 'off',
  concurrency: 2,
  timeoutMS: 5000,
  dryRunTimeoutMinutes: 1,
  reporters: ['clear-text', 'json', 'html'],
  jsonReporter: { fileName: `tools/reports/mutation/${name}/mutation.json` },
  htmlReporter: { fileName: `tools/reports/mutation/${name}/index.html` },
  thresholds: { high: 95, low: 95, break: 95 },
  ignorePatterns: [
    '.stryker-tmp/**',
    '**/coverage/**',
    '**/reports/**',
    'evals/.results/**',
    'suggestions/**',
    'evals/tasks/**',
    'evals/routing-replay/**',
    'evals/experiments/**',
    'evals/tools/**',
    'tools/test/fixtures/**',
    'docs/**',
    'use-cases/**',
    '.github/**',
  ],
  tempDirName: `.stryker-tmp/${name}`,
};
