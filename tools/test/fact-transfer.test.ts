import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { after, test } from 'node:test';
import { factOutcome } from '../src/grade/facts.ts';
import { transferCases } from '../src/transfer-plan.ts';
import { FACT_PLAN } from '../src/transfer-suite.ts';

const ROOT = resolve(import.meta.dirname, '../..');
const tmp = mkdtempSync(join(tmpdir(), 'fact-graders-'));
after(() => {
  rmSync(tmp, { recursive: true, force: true });
});
function rewrite(task: string, file: string, from: string, to: string): string {
  const workdir = mkdtempSync(join(tmp, 'rewrite-'));
  cpSync(join(ROOT, 'evals/tasks', task, 'fixtures/pass'), workdir, { recursive: true });
  const target = join(workdir, file);
  const original = readFileSync(target, 'utf8');
  assert.ok(original.includes(from), 'calibration changes source');
  writeFileSync(target, original.replace(from, to));
  return workdir;
}
function grade(task: string, workdir: string): boolean {
  return factOutcome(task)({ workdir, transcript: '' }).pass;
}

test('fact-sensitive goldens reject pristine and near-pass answers and accept actual fixes', () => {
  for (const spec of transferCases(ROOT, FACT_PLAN))
    for (const [folder, expected] of [
      ['fixture', false],
      ['fixtures/fail', false],
      ['fixtures/pass', true],
    ] as const)
      assert.equal(grade(spec.task, join(ROOT, 'evals/tasks', spec.task, folder)), expected, `${spec.task}/${folder}`);
});
test('cache contract accepts capability guards, aliases and early return but rejects dead/comment-only fixes', () => {
  const task = 'transfer-cache-minor-floor';
  const file = 'src/Subscriber/DeliveryBadgeSubscriber.php';
  const call = '$this->dispatcher->dispatch(new AddCacheTagEvent($tag));';
  const guarded = `if (method_exists(CacheTagCollector::class, 'addTag')) {
      $this->collector->addTag($tag); return;
    }
    ${call}`;
  assert.equal(grade(task, rewrite(task, file, call, guarded)), true);
  const alias = rewrite(
    task,
    file,
    'new AddCacheTagEvent($tag)',
    'new \\Shopware\\Core\\Framework\\Adapter\\Cache\\Event\\AddCacheTagEvent($tag)',
  );
  assert.equal(grade(task, alias), true, 'fully qualified constructor');
  for (const replacement of [
    `// ${call}\n    $this->collector->addTag($tag);`,
    `if (false) { ${call} }`,
    call.replace('$tag', "'wrong-channel'"),
  ])
    assert.equal(grade(task, rewrite(task, file, call, replacement)), false);
});
test('PHP rewrites outside the supported contract are ungradable, not negative model outcomes', () => {
  const task = 'transfer-cache-minor-floor';
  const workdir = rewrite(
    task,
    'src/Subscriber/DeliveryBadgeSubscriber.php',
    '$this->dispatcher->dispatch(new AddCacheTagEvent($tag));',
    'unknown_runtime_helper($tag);',
  );
  assert.throws(() => grade(task, workdir), /unsupported PHP call/u);
});
test('compiled caption workflow accepts explicit cross-version handlers and rejects decoy bindings and data loss', () => {
  const task = 'transfer-admin-caption';
  const prefix = 'src/Resources/app/administration/src/module/sw-delivery-receipt/';
  const template = `${prefix}sw-delivery-receipt.html.twig`;
  assert.equal(
    grade(
      task,
      rewrite(
        task,
        template,
        'v-model:value="form.caption"',
        ':value="form.caption" @input="onCaption" @change="onCaption" @update:value="onCaption"',
      ),
    ),
    true,
  );
  for (const binding of ['v-model="form.caption"', 'v-model:value="form.footerCode"', ':value="form.caption"'])
    assert.equal(grade(task, rewrite(task, template, 'v-model:value="form.caption"', binding)), false);
  assert.equal(grade(task, rewrite(task, `${prefix}index.js`, '...this.form', 'caption: this.form.caption')), false);
});
test('ACL workflow rejects missing inheritance, no migration, wrong migration keys and privilege escalation', () => {
  const task = 'transfer-acl-roundtrip';
  const file = 'src/Migration/Migration1783000000DeliveryZonePrivileges.php';
  const acl = 'src/Resources/app/administration/src/acl/index.js';
  assert.equal(
    grade(
      task,
      rewrite(
        task,
        acl,
        '"dependencies": [\n                "swag_delivery_zone.viewer"\n            ]',
        '"dependencies": []',
      ),
    ),
    false,
  );
  assert.equal(grade(task, rewrite(task, file, "'swag_delivery_zone.viewer' =>", "'other.viewer' =>")), false);
  assert.equal(
    grade(
      task,
      rewrite(task, file, "['swag_delivery_zone:read'],", "['swag_delivery_zone:read', 'swag_delivery_zone:delete'],"),
    ),
    false,
  );
  assert.equal(
    grade(task, rewrite(task, 'src/Resources/app/administration/src/main.js', "import './acl';", "// import './acl';")),
    false,
  );
});

test('ACL migration accepts role-key expansion and a class constant on the normal persisted role workflow', () => {
  const task = 'transfer-acl-roundtrip';
  const file = 'src/Migration/Migration1783000000DeliveryZonePrivileges.php';
  const constant = `private const ADDITIONS = [
    'swag_delivery_zone.viewer' => ['swag_delivery_zone:read'],
    'swag_delivery_zone.editor' => ['swag_delivery_zone:update'],
    'swag_delivery_zone.creator' => ['swag_delivery_zone:create'],
    'swag_delivery_zone.deleter' => ['swag_delivery_zone:delete'],
  ];`;
  const workdir = rewrite(task, file, 'extends MigrationStep\n{', `extends MigrationStep\n{\n${constant}`);
  const path = join(workdir, file);
  const text = readFileSync(path, 'utf8');
  writeFileSync(
    path,
    text.replace(
      /\$this->addAdditionalPrivileges\(\$connection, \[[\s\S]*?\]\);/u,
      '$this->addAdditionalPrivileges($connection, self::ADDITIONS);',
    ),
  );
  assert.equal(grade(task, workdir), true);
  const snapshots = join(workdir, 'data/existing-roles.json');
  writeFileSync(snapshots, '[]');
  assert.equal(grade(task, workdir), false, 'given role snapshots cannot be weakened');
});
