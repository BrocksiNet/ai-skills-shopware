import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, describe, test } from 'node:test';
import { borrowedAudienceErrors, expectedRules, reviewReachErrors } from '../src/borrow-audience.ts';
import type { Audience, Rule } from '../src/catalog.ts';
import { resolveBorrowed } from '../src/route-borrow.ts';
import { loadRoutes, renderTable, routeErrors } from '../src/routes.ts';

const root = mkdtempSync(join(tmpdir(), 'route-borrow-'));
after(() => {
  rmSync(root, { recursive: true, force: true });
});

/** `skills/<name>/` with `routes.json` and `references/<refs>`. */
function skill(name: string, routes: unknown, refs: string[] = []): string {
  const dir = join(root, name);
  mkdirSync(join(dir, 'references'), { recursive: true });
  for (const r of refs) writeFileSync(join(dir, 'references', r), '# ref\n');
  writeFileSync(join(dir, 'routes.json'), JSON.stringify(routes));
  return dir;
}

const lender = { reference: 'references/dal.md', when: 'DAL reads.', anchors_any: ['new Criteria\\('] };
skill('sw-lender', { routes: [lender] }, ['dal.md']);
const BORROW = '../sw-lender/references/dal.md';

describe('resolveBorrowed', () => {
  const dir = join(root, 'borrower');

  test('a borrowed route with no triggers takes when and triggers from the lender', () => {
    const { value, errors } = resolveBorrowed(dir, { routes: [{ reference: BORROW }] });
    assert.deepEqual(errors, []);
    assert.deepEqual(value, { routes: [{ when: 'DAL reads.', anchors_any: ['new Criteria\\('], reference: BORROW }] });
  });

  test('own fields win; a route with its own trigger is left alone', () => {
    const own = { reference: BORROW, when: 'Mine.', always: true };
    assert.deepEqual(resolveBorrowed(dir, { routes: [own] }).value, { routes: [own] });
    const when = resolveBorrowed(dir, { routes: [{ reference: BORROW, when: 'Mine.' }] }).value;
    assert.deepEqual(when, { routes: [{ when: 'Mine.', anchors_any: ['new Criteria\\('], reference: BORROW }] });
  });

  test('a missing lending skill or route is an error', () => {
    const { errors } = resolveBorrowed(dir, {
      routes: [{ reference: '../sw-none/references/a.md' }, { reference: '../sw-lender/references/x.md' }],
    });
    assert.deepEqual(errors, [
      'routes[0]: sw-none has no routes.json',
      'routes[1]: sw-lender has no route for references/x.md',
    ]);
  });

  test('own references and anything that is not a route file pass through', () => {
    const own = { routes: [{ reference: 'references/a.md', when: 'A.', always: true }] };
    assert.deepEqual(resolveBorrowed(dir, own), { value: own, errors: [] });
    assert.deepEqual(resolveBorrowed(dir, [1]), { value: [1], errors: [] });
  });
});

describe('borrowed routes in a skill', () => {
  const dir = skill('shopware-borrower', { routes: [{ reference: BORROW }] });

  test('load with the lender triggers and render with the lending skill name', () => {
    const routes = loadRoutes(dir);
    assert.ok(routes !== null);
    const table = renderTable(routes);
    assert.match(
      table,
      /\| \[`lender: dal\.md`\]\(\.\.\/sw-lender\/references\/dal\.md\) \| DAL reads\. \| `new Criteria\(` \|/u,
    );
    writeFileSync(join(dir, 'SKILL.md'), `x\n${table}\n`);
    assert.deepEqual(routeErrors(dir, 's'), []);
  });

  test('a broken borrow is a route error', () => {
    const broken = skill('sw-broken', { routes: [{ reference: '../sw-lender/references/x.md' }] });
    writeFileSync(join(broken, 'SKILL.md'), 'x\n');
    assert.deepEqual(routeErrors(broken, 's'), [
      's/routes.json: routes[0]: sw-lender has no route for references/x.md',
    ]);
    assert.throws(() => loadRoutes(broken), /no route for references\/x\.md/u);
  });
});

const rule = (id: string, audience: Audience[], status = 'active'): Rule => ({
  id,
  skill: 'sw-lender',
  file: 'skills/sw-lender/references/dal.md',
  title: id,
  status: status === 'active' ? 'active' : 'retired',
  since: '2026-10-21',
  eval: null,
  eval_reason: 'test',
  core_guide_ids: [],
  audience,
  defer_on_trunk: false,
});

describe('borrowedAudienceErrors', () => {
  const repo = join(root, 'repo');
  const write = (path: string, text: string): void => {
    mkdirSync(join(repo, path, '..'), { recursive: true });
    writeFileSync(join(repo, path), text);
  };
  write('skills/sw-lender/routes.json', JSON.stringify({ routes: [lender] }));
  write(
    'skills/shopware-review/routes.json',
    JSON.stringify({ audience: ['plugin'], routes: [{ reference: BORROW }] }),
  );
  const rules = [rule('X-001', ['core', 'plugin']), rule('X-002', ['core']), rule('X-003', ['core'], 'retired')];

  test('an active rule for another audience must be named in the borrowing skill', () => {
    assert.deepEqual(borrowedAudienceErrors(repo, rules, []), [
      'skills/shopware-review: borrows skills/sw-lender/references/dal.md but does not name X-002 (audience core) as out of scope',
    ]);
    const elsewhere = [{ id: 'X-002', file: 'skills/sw-lender/SKILL.md' }];
    assert.equal(borrowedAudienceErrors(repo, rules, elsewhere).length, 1);
    const named = [{ id: 'X-002', file: 'skills/shopware-review/references/lenses.md' }];
    assert.deepEqual(borrowedAudienceErrors(repo, rules, named), []);
  });

  test('a bad audience is an error', () => {
    write('skills/shopware-review/routes.json', JSON.stringify({ audience: ['shop'], routes: [] }));
    assert.match(borrowedAudienceErrors(repo, rules, []).join(), /audience must be a non-empty list/u);
  });
});

describe('reviewReachErrors', () => {
  const repo = join(root, 'reach');
  const write = (path: string, text: string): void => {
    mkdirSync(join(repo, path, '..'), { recursive: true });
    writeFileSync(join(repo, path), text);
  };
  write('skills/sw-lender/routes.json', JSON.stringify({ routes: [lender] }));
  write(
    'skills/shopware-review/routes.json',
    JSON.stringify({ audience: ['plugin'], routes: [{ reference: BORROW }] }),
  );
  write('evals/tasks/review-x-catch/skills', 'sw-lender\nshopware-review\n');
  write('tools/graders/review-x-catch.ts', "export const grade = reviewCatch({ rule: 'X-001', file: 'src/**' });\n");
  const inSkill = { ...rule('X-001', ['plugin']), file: 'skills/sw-lender/SKILL.md' };

  test('a rule a catch task expects must be tagged where the reviewing skill reads', () => {
    assert.deepEqual(reviewReachErrors(repo, new Map([['X-001', rule('X-001', ['plugin'])]])), []);
    assert.deepEqual(reviewReachErrors(repo, new Map([['X-001', inSkill]])), [
      'evals/tasks/review-x-catch: expects X-001, tagged in skills/sw-lender/SKILL.md, which shopware-review does not read; tag it in a reference shopware-review borrows',
    ]);
  });

  test('a catch grader expects its rule; a near-miss grader its accept list, not the decoy', () => {
    assert.deepEqual(expectedRules("reviewCatch({ rule: 'ADM-004', file: 'a' })", 'review-a-catch'), ['ADM-004']);
    const nearMiss = "reviewNearMiss({ rule: 'SEC-005', accept: ['SEC-008', 'PLG-003'] })";
    assert.deepEqual(expectedRules(nearMiss, 'review-a-near-miss'), ['SEC-008', 'PLG-003']);
  });
});
