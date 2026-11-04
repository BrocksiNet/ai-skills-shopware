// Fast transcript-to-verdict workflows, without unrelated fixture/CLI tests per mutant.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { reviewCatch, reviewIgnore, reviewNearMiss } from '../src/grade/review.ts';

const fence = (findings: unknown[]): string => `\`\`\`json\n${JSON.stringify({ findings })}\n\`\`\`\n`;
const finding = { rule_id: 'ARCH-001', severity: 'major', file: 'src/A.php', summary: 'never reset' };

const run = (transcript: string): { workdir: string; transcript: string } => ({ workdir: '.', transcript });

describe('review graders', () => {
  const expectation = { rule: 'ARCH-001', file: 'src/**', minSeverity: 'major' as const, summary: /reset/iu };

  test('catch passes on the finding; fails without it or without a json block', () => {
    assert.equal(reviewCatch(expectation)(run(fence([finding]))).pass, true);
    assert.equal(reviewCatch(expectation)(run(fence([{ ...finding, summary: 'Rename this variable.' }]))).pass, false);
    assert.equal(
      reviewCatch(expectation)(run(fence([finding, { ...finding, rule_id: 'TEST-001', summary: 'Unrelated claim.' }])))
        .pass,
      false,
    );
    assert.match(reviewCatch(expectation)(run(fence([]))).detail, /^no major\+ finding for ARCH-001/u);
    assert.match(reviewCatch(expectation)(run('')).detail, /no fenced json block/u);
  });

  test('ignore fails on a false positive', () => {
    assert.equal(reviewIgnore(expectation)(run(fence([]))).pass, true);
    assert.match(reviewIgnore(expectation)(run(fence([finding]))).detail, /^false positive: src\/A\.php/u);
  });

  test('near-miss passes with no ID or an accepted one; fails on the decoy, another ID or no report', () => {
    const nearMiss = reviewNearMiss({ ...expectation, rule: 'SF-013', accept: ['ARCH-001'] });
    assert.equal(nearMiss(run(fence([finding]))).pass, true);
    assert.equal(nearMiss(run(fence([{ ...finding, rule_id: null }]))).pass, true);
    assert.match(nearMiss(run(fence([{ ...finding, rule_id: 'SF-013' }]))).detail, /^cites SF-013 for: never reset/u);
    assert.equal(nearMiss(run(fence([{ ...finding, rule_id: 'IMP-008' }]))).pass, false);
    const elsewhere = { ...finding, rule_id: 'SF-013', file: 'src/B.php', summary: 'another problem' };
    assert.equal(nearMiss(run(fence([finding, elsewhere]))).pass, true);
    assert.equal(nearMiss(run(fence([{ ...finding, severity: 'minor' }]))).pass, false);
    assert.match(nearMiss(run(fence([]))).detail, /^no major\+ finding at src\/\*\*/u);
  });
});
