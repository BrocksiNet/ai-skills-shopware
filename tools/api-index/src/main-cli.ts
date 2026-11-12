// The dispatcher behind the bundled shopware-api.mjs: `diff` and `facts`,
// with a Node version check first.
import { type Io, runDiff } from './diff-cli.ts';
import { runFacts } from './facts-cli.ts';

export const USAGE = `usage: shopware-api.mjs <command> [options]

  diff   what a change or an update does to Shopware's public API: routes,
         entity fields, feature flags, config keys, admin components and
         blocks, storefront templates, blocks and JS plugins, Twig functions
  facts  which Shopware API an extension uses that is missing, deprecated
         or internal in a release of its composer range

<command> --help shows the options. Built from the public API index of
shopware/shopware: https://github.com/BrocksiNet/ai-skills-shopware
`;

export const MIN_NODE = 26;

export function run(argv: string[], io: Io, nodeVersion: string): Promise<number> {
  const major = Number(nodeVersion.split('.')[0]);
  if (major < MIN_NODE) {
    io.err(`shopware-api needs Node ${MIN_NODE} or newer; this is Node ${nodeVersion}.\n`);
    return Promise.resolve(2);
  }
  const [command, ...rest] = argv;
  if (command === 'diff') return runDiff(rest, io);
  if (command === 'facts') return runFacts(rest, io);
  if (command === undefined || command === '--help' || command === '-h' || command === 'help') {
    io.out(USAGE);
    return Promise.resolve(command === undefined ? 2 : 0);
  }
  io.err(`unknown command: ${command}\n${USAGE}`);
  return Promise.resolve(2);
}
