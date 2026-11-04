import { discovery } from '../src/grade/discovery.ts';

export const grade = discovery(
  ['sw-plugin-development', 'sw-testing'],
  ['sw-app-development', 'sw-admin-js', 'sw-storefront'],
);
