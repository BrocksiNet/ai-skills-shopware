import assert from 'node:assert/strict';
import { methodValue, phpCallable, serviceState } from '../fact-php.mjs';
import { serviceContract } from '../service-contract.mjs';

// The historical task ID stays stable. LoggerInterface is the real interface;
// modern Shopware deliberately injects the concrete EntityRepository.
export function grade({ workdir }) {
  return serviceContract(workdir, 'ProductReader', (parsed) => {
    for (const product of [{ id: 'p1' }, null]) {
      let searches = 0;
      let logs = 0;
      const context = {};
      const repository = {
        search: phpCallable(['criteria', 'context'], (criteria, actualContext) => {
          assert.deepEqual(criteria, ['p1'], 'keep the product ID criteria');
          assert.equal(actualContext, context, 'keep the repository context');
          searches++;
          return { first: () => product };
        }),
      };
      const logger = {
        debug() {
          logs++;
        },
      };
      const state = serviceState(
        parsed,
        (type) => {
          if (type === 'Psr\\Log\\LoggerInterface') return logger;
          assert.equal(
            type,
            'Shopware\\Core\\Framework\\DataAbstractionLayer\\EntityRepository',
            'inject the existing logger interface and the supported concrete DAL repository',
          );
          return repository;
        },
        {
          constructors: {
            'Shopware\\Core\\Framework\\DataAbstractionLayer\\Search\\Criteria': phpCallable(['ids'], (ids) => ids),
          },
          statics: { 'Shopware\\Core\\Framework\\Context': { createDefaultContext: () => context } },
        },
      );
      assert.equal(methodValue(state, 'findById', ['p1']), product, 'keep found and missing product behavior');
      assert.equal(searches, 1, 'use the injected DAL repository');
      assert.equal(logs, 1, 'use the injected logger');
    }
  });
}
