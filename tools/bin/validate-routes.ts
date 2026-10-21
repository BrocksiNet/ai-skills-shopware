// Check every skills/<skill>/routes.json and its rendered table (plan WP4).
// Part of validate-skills.
//
//   node tools/bin/validate-routes.ts [repo-root]
import { resolve } from 'node:path';
import { checkRoutes } from '../src/check-reports.ts';
import { stdout } from '../src/cli.ts';

process.exitCode = checkRoutes(resolve(process.argv[2] ?? resolve(import.meta.dirname, '../..')), stdout);
