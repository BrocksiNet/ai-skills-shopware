import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  attributeBasename,
  attributeClassRefNames,
  classAttributes,
  findClass,
  findMethod,
  methodAttributes,
  parsePhp,
} from '../src/php.mjs';
import { evaluate as evaluateCovers } from '../src/tasks/one-covers-class-per-file.mjs';
import { evaluate as evaluateBc } from '../src/tasks/bc-change-not-deprecated-reason.mjs';

test('commented CoversClass is not an attribute node', () => {
  const ast = parsePhp(`<?php
// #[CoversClass(CartNormalizer::class)]
final class CartNormalizerTest {}
`);
  const cls = findClass(ast, 'CartNormalizerTest');
  const covers = classAttributes(cls).filter((attr) => attributeBasename(attr) === 'CoversClass');
  assert.equal(covers.length, 0);
  assert.equal(evaluateCovers(ast).score, 0);
});

test('real CoversClass on the test class passes', () => {
  const ast = parsePhp(`<?php
#[CoversClass(CartNormalizer::class)]
final class CartNormalizerTest {}
`);
  const cls = findClass(ast, 'CartNormalizerTest');
  const covers = classAttributes(cls).filter((attr) => attributeBasename(attr) === 'CoversClass');
  assert.deepEqual(attributeClassRefNames(covers[0]), ['CartNormalizer']);
  assert.equal(evaluateCovers(ast).score, 1);
});

test('second CoversClass on the same class fails', () => {
  const ast = parsePhp(`<?php
#[CoversClass(CartNormalizer::class)]
#[CoversClass(LineItemHelper::class)]
final class CartNormalizerTest {}
`);
  assert.equal(evaluateCovers(ast).score, 0);
});

test('ParameterTypeNarrowing on unused() is not on load()', () => {
  const ast = parsePhp(`<?php
use Shopware\\Core\\Framework\\Deprecation\\BCChange\\ParameterTypeNarrowing;
final class LegacyIdLoader {
    #[ParameterTypeNarrowing(version: 'v6.8.0', parameterName: 'id', newType: 'string')]
    private function unused(string|int $id): string { return (string) $id; }
    public function load(string|int $id): string { return (string) $id; }
}
`);
  const load = findMethod(findClass(ast, 'LegacyIdLoader'), 'load');
  const attrs = methodAttributes(load).filter((attr) => attributeBasename(attr) === 'ParameterTypeNarrowing');
  assert.equal(attrs.length, 0);
  assert.equal(evaluateBc(ast, '').score, 0);
});

test('ParameterTypeNarrowing on load() with named-arg order swap passes', () => {
  const ast = parsePhp(`<?php
use Shopware\\Core\\Framework\\Deprecation\\BCChange\\ParameterTypeNarrowing;
final class LegacyIdLoader {
    #[ParameterTypeNarrowing(newType: 'string', parameterName: 'id', version: 'v6.8.0')]
    public function load(int|string $id): string { return (string) $id; }
}
`);
  assert.equal(evaluateBc(ast, '').score, 1);
});

test('@deprecated reason in source fails even when the attribute is correct', () => {
  const ast = parsePhp(`<?php
use Shopware\\Core\\Framework\\Deprecation\\BCChange\\ParameterTypeNarrowing;
final class LegacyIdLoader {
    #[ParameterTypeNarrowing(version: 'v6.8.0', parameterName: 'id', newType: 'string')]
    public function load(string|int $id): string { return (string) $id; }
}
`);
  assert.equal(evaluateBc(ast, "/** @deprecated reason: no */").score, 0);
});

test('unparseable PHP is null, not a throw', () => {
  assert.equal(parsePhp('<?php class {'), null);
});
