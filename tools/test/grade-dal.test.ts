import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, describe, test } from 'node:test';
import { grade as exportGrade } from '../graders/dal-export-pages-through-all.ts';
import { grade as limitGrade } from '../graders/dal-search-without-limit.ts';
import { methodReaches, phpMethodNames } from '../src/grade/php-calls.ts';

const dirs: string[] = [];
after(() => {
  for (const dir of dirs) rmSync(dir, { recursive: true, force: true });
});

/** A workdir with one PHP file holding `body` in a class named after the file. */
function workdir(file: string, body: string): string {
  const dir = mkdtempSync(join(tmpdir(), 'grade-dal-'));
  dirs.push(dir);
  mkdirSync(join(dir, 'src'), { recursive: true });
  writeFileSync(
    join(dir, 'src', file),
    `<?php declare(strict_types=1);\n\nclass ${file.replace('.php', '')}\n{\n${body}\n}\n`,
  );
  return dir;
}

describe('methodReaches', () => {
  const code = [
    'function a() { return $this->b(); }',
    'function b() { $c->setLimit(5); }',
    'function unused() { $c->setOffset(1); }',
  ].join('\n');

  test('lists the declared methods', () => {
    assert.deepEqual(phpMethodNames(code), ['a', 'b', 'unused']);
  });

  test('follows same-class calls, not unused helpers', () => {
    assert.equal(methodReaches(code, 'a', /setLimit/u), true);
    assert.equal(methodReaches(code, 'a', /setOffset/u), false);
  });
});

describe('dal-export-pages-through-all', () => {
  test('passes a DBAL query paged by a last-ID cursor in a loop', () => {
    const dir = workdir(
      'Exporter.php',
      [
        '    public function export(string $categoryId): void',
        '    {',
        '        $lastId = null;',
        '        do {',
        "            $ids = $this->connection->fetchFirstColumn('SELECT id FROM product_category WHERE category_id = :c AND id > :last ORDER BY id LIMIT 500', ['c' => $categoryId, 'last' => $lastId]);",
        '            $lastId = end($ids);',
        '        } while ($ids !== []);',
        '    }',
      ].join('\n'),
    );
    assert.equal(exportGrade({ workdir: dir, transcript: '' }).pass, true);
  });

  test('fails a RepositoryIterator that fetches only the first batch', () => {
    const dir = workdir(
      'Exporter.php',
      [
        '    public function export(Criteria $criteria, Context $context): array',
        '    {',
        '        $iterator = new RepositoryIterator($this->productRepository, $context, $criteria);',
        '        return $iterator->fetchIds() ?? [];',
        '    }',
      ].join('\n'),
    );
    assert.equal(exportGrade({ workdir: dir, transcript: '' }).pass, false);
  });

  test('fails one SQL read of every row', () => {
    const dir = workdir(
      'Exporter.php',
      [
        '    public function export(string $categoryId): array',
        '    {',
        "        return $this->connection->fetchFirstColumn('SELECT id FROM product_category WHERE category_id = :c', ['c' => $categoryId]);",
        '    }',
      ].join('\n'),
    );
    assert.equal(exportGrade({ workdir: dir, transcript: '' }).pass, false);
  });
});

describe('dal-search-without-limit', () => {
  test('passes a RepositoryIterator read', () => {
    const dir = workdir(
      'ProductLoader.php',
      [
        '    public function __construct(private readonly EntityRepository $productRepository) {}',
        '    public function loadForCategory(string $categoryId, Context $context): array',
        '    {',
        '        $iterator = new RepositoryIterator($this->productRepository, $context, $this->criteria($categoryId));',
        '        return $iterator->fetchIds() ?? [];',
        '    }',
        '    private function criteria(string $categoryId): Criteria { return new Criteria(); }',
      ].join('\n'),
    );
    assert.equal(limitGrade({ workdir: dir, transcript: '' }).pass, true);
  });

  test('passes a bounded search', () => {
    const dir = workdir(
      'ProductLoader.php',
      [
        '    public function __construct(private readonly EntityRepository $productRepository) {}',
        '    public function loadForCategory(string $categoryId, Context $context): array',
        '    {',
        '        $criteria = (new Criteria())->setLimit(12);',
        '        return $this->productRepository->searchIds($criteria, $context)->getIds();',
        '    }',
      ].join('\n'),
    );
    assert.equal(limitGrade({ workdir: dir, transcript: '' }).pass, true);
  });
});
