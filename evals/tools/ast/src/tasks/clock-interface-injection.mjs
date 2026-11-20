import assert from 'node:assert/strict';
import { methodValue, serviceState } from '../fact-php.mjs';
import { serviceContract } from '../service-contract.mjs';
import { nodeName, walkPhp } from '../php.mjs';

export function grade({ workdir }) {
  return serviceContract(workdir, 'TokenExpiryChecker', (parsed) => {
    walkPhp(parsed.klass, (node) => {
      if (node.kind === 'call')
        assert.ok(
          !['time', 'date', 'microtime'].includes(nodeName(node.what).replace(/^\\/, '')),
          'use the injected clock, not a system-time function',
        );
    });
    for (const [now, issuedAt, ttl] of [
      [109, 100, 10],
      [110, 100, 10],
      [111, 100, 10],
      [100, 100, 0],
      [0, 0, 1],
      [9999, 50, 20],
    ]) {
      let reads = 0;
      let injected = false;
      const clock = {
        now() {
          reads++;
          return { getTimestamp: () => now };
        },
      };
      const state = serviceState(parsed, (type) => {
        assert.equal(type, 'Psr\\Clock\\ClockInterface', 'inject the PSR-20 clock');
        injected = true;
        return clock;
      });
      assert.ok(injected, 'inject the clock through the constructor');
      assert.equal(
        methodValue(state, 'isExpired', [issuedAt, ttl]),
        now >= issuedAt + ttl,
        `expiry boundary now=${now} issuedAt=${issuedAt} ttl=${ttl}`,
      );
      assert.ok(reads > 0, 'the injected clock determines expiry');
    }
  });
}
