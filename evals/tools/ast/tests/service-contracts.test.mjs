import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { test } from 'node:test';
import { grade as clockGrade } from '../src/tasks/clock-interface-injection.mjs';
import { grade as httpGrade } from '../src/tasks/core-http-client-behind-flag.mjs';
import { grade as repositoryGrade } from '../src/tasks/interface-di-repository.mjs';

const tasks = resolve(import.meta.dirname, '../../../tasks');
const specs = [
  ['clock-interface-injection', 'TokenExpiryChecker', clockGrade],
  ['core-http-client-behind-flag', 'RemoteSnippetFetcher', httpGrade],
  ['interface-di-repository', 'ProductReader', repositoryGrade],
];

function withSource(name, source, check) {
  const workdir = mkdtempSync(join(tmpdir(), 'service-contract-'));
  try {
    writeFileSync(join(workdir, `${name}.php`), source);
    return check(workdir);
  } finally {
    rmSync(workdir, { recursive: true, force: true });
  }
}

function source(task, name, fixture = 'fixtures/pass') {
  return readFileSync(join(tasks, task, fixture, `${name}.php`), 'utf8');
}

for (const [task, name, grade] of specs) {
  for (const [fixture, score] of [
    ['fixture', 0],
    ['fixtures/fail', 0],
    ['fixtures/pass', 1],
  ]) {
    test(`${task}: ${fixture} has the expected contract`, () => {
      assert.equal(grade({ workdir: join(tasks, task, fixture) }).score, score);
    });
  }
  test(`${task}: a correct leftover file cannot hide an unchanged subject`, () => {
    withSource(name, source(task, name, 'fixture'), (workdir) => {
      writeFileSync(join(workdir, 'Leftover.php'), source(task, name));
      assert.equal(grade({ workdir }).score, 0);
    });
  });
}

const clock = source('clock-interface-injection', 'TokenExpiryChecker');
for (const [label, from, to] of [
  ['constant false', 'return $this->clock->now()->getTimestamp() >= ($issuedAt + $ttlSeconds);', 'return false;'],
  ['off-by-one expiry', ' >= ', ' > '],
  ['ignored TTL', '($issuedAt + $ttlSeconds)', '$issuedAt'],
  ['a local lookalike interface', 'use Psr\\Clock\\ClockInterface;', 'use Fake\\ClockInterface;'],
]) {
  test(`clock rejects ${label}`, () => {
    withSource('TokenExpiryChecker', clock.replace(from, to), (workdir) => {
      assert.equal(clockGrade({ workdir }).score, 0);
    });
  });
}
test('clock accepts an imported alias and a local timestamp variable', () => {
  const variant = clock
    .replace('use Psr\\Clock\\ClockInterface;', 'use Psr\\Clock\\ClockInterface as Clock;')
    .replace('readonly ClockInterface', 'readonly Clock')
    .replace(
      'return $this->clock->now()->getTimestamp()',
      '$now = $this->clock->now()->getTimestamp();\n        return $now',
    );
  withSource('TokenExpiryChecker', variant, (workdir) => assert.equal(clockGrade({ workdir }).score, 1));
});
test('clock accepts explicit constructor assignment and a helper', () => {
  const variant = clock
    .replace('private readonly ClockInterface $clock,', 'ClockInterface $clock,')
    .replace(
      'final class TokenExpiryChecker\n{',
      'final class TokenExpiryChecker\n{\n    private ClockInterface $clock;',
    )
    .replace('    ) {\n    }', '    ) {\n        $this->clock = $clock;\n    }')
    .replace('$this->clock->now()->getTimestamp()', '$this->timestamp()')
    .replace(
      '    public function isExpired',
      '    private function timestamp(): int { return $this->clock->now()->getTimestamp(); }\n\n    public function isExpired',
    );
  withSource('TokenExpiryChecker', variant, (workdir) => assert.equal(clockGrade({ workdir }).score, 1));
});

const http = source('core-http-client-behind-flag', 'RemoteSnippetFetcher');
for (const [label, from, to] of [
  ['three-part release label as a flag', "'v6.8.0.0'", "'v6.8.0'"],
  ['inverted branches', 'if (Feature::isActive', 'if (!Feature::isActive'],
  ['wrong URL', "request('GET', $url)", "request('GET', 'https://wrong.test')"],
  [
    'an ignored HTTP body',
    "return $this->httpClient->request('GET', $url)->getContent();",
    "$this->httpClient->request('GET', $url)->getContent(); return 'constant';",
  ],
  ['a changed legacy error', 'Could not fetch snippet from %s', 'Changed legacy error %s'],
]) {
  test(`HTTP rejects ${label}`, () => {
    withSource('RemoteSnippetFetcher', http.replace(from, to), (workdir) =>
      assert.equal(httpGrade({ workdir }).score, 0),
    );
  });
}
test('HTTP comments cannot provide injection or flag checks', () => {
  const variant = source('core-http-client-behind-flag', 'RemoteSnippetFetcher', 'fixture').replace(
    'final class',
    '// HttpClientInterface __construct Feature::isActive(\nfinal class',
  );
  withSource('RemoteSnippetFetcher', variant, (workdir) => assert.equal(httpGrade({ workdir }).score, 0));
});
test('HTTP accepts reversed named request arguments and a response variable', () => {
  const variant = http.replace(
    "return $this->httpClient->request('GET', $url)->getContent();",
    "$response = $this->httpClient->request(url: $url, method: 'GET'); return $response->getContent();",
  );
  withSource('RemoteSnippetFetcher', variant, (workdir) => assert.equal(httpGrade({ workdir }).score, 1));
});
test('HTTP accepts a fully qualified interface and an aliased Feature import', () => {
  const variant = http
    .replace('readonly HttpClientInterface', 'readonly \\Symfony\\Contracts\\HttpClient\\HttpClientInterface')
    .replace('use Shopware\\Core\\Framework\\Feature;', 'use Shopware\\Core\\Framework\\Feature as Flags;')
    .replace('Feature::isActive', 'Flags::isActive');
  withSource('RemoteSnippetFetcher', variant, (workdir) => assert.equal(httpGrade({ workdir }).score, 1));
});

const reader = source('interface-di-repository', 'ProductReader');
for (const [label, from, to] of [
  ['the removed DAL interface', 'readonly EntityRepository $', 'readonly EntityRepositoryInterface $'],
  ['an invented product interface', 'readonly EntityRepository $', 'readonly ProductRepositoryInterface $'],
  ['an unused logger', "$this->logger->debug('Reading product', ['id' => $productId]);", '// LoggerInterface'],
  ['a fabricated product result', 'return $product;', 'return null;'],
]) {
  test(`repository task rejects ${label}`, () => {
    withSource('ProductReader', reader.replace(from, to), (workdir) =>
      assert.equal(repositoryGrade({ workdir }).score, 0),
    );
  });
}
test('repository accepts an aliased PSR logger and renamed receiver', () => {
  const variant = reader
    .replace('use Psr\\Log\\LoggerInterface;', 'use Psr\\Log\\LoggerInterface as Log;')
    .replace('readonly LoggerInterface $logger', 'readonly Log $log')
    .replace('$this->logger', '$this->log');
  withSource('ProductReader', variant, (workdir) => assert.equal(repositoryGrade({ workdir }).score, 1));
});
test('unsupported PHP execution is infrastructure, not a model failure', () => {
  withSource(
    'TokenExpiryChecker',
    clock.replace('return $this->clock->now()->getTimestamp()', 'return abs($this->clock->now()->getTimestamp())'),
    (workdir) => {
      const run = spawnSync(
        process.execPath,
        [resolve(import.meta.dirname, '../bin/grade.mjs'), 'clock-interface-injection'],
        {
          env: { ...process.env, WORKDIR: workdir },
          encoding: 'utf8',
        },
      );
      assert.equal(run.status, 2);
      assert.match(run.stderr, /ungradable: unsupported PHP call abs/);
    },
  );
});

test('unsupported PHP in a failure branch stays infrastructure', () => {
  withSource('RemoteSnippetFetcher', http.replace('new \\RuntimeException', 'new \\UnknownException'), (workdir) => {
    const run = spawnSync(
      process.execPath,
      [resolve(import.meta.dirname, '../bin/grade.mjs'), 'core-http-client-behind-flag'],
      {
        env: { ...process.env, WORKDIR: workdir },
        encoding: 'utf8',
      },
    );
    assert.equal(run.status, 2);
    assert.match(run.stderr, /ungradable: unsupported constructor UnknownException/);
  });
});
