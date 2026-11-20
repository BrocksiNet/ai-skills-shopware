import assert from 'node:assert/strict';
import { methodValue, phpCallable, serviceState, UnsupportedPhp } from '../fact-php.mjs';
import { serviceContract } from '../service-contract.mjs';

export function grade({ workdir }) {
  return serviceContract(workdir, 'RemoteSnippetFetcher', (parsed) => {
    for (const active of [false, true]) {
      for (const content of ['snippet body', '', false]) {
        let requests = 0;
        let legacy = 0;
        let responseReads = 0;
        const url = 'https://example.test/snippet.json';
        const httpError = new Error('HTTP failure');
        const client = {
          request: phpCallable(['method', 'url', 'options'], (method, actualUrl) => {
            assert.equal(method, 'GET');
            assert.equal(actualUrl, url);
            requests++;
            return {
              getContent() {
                responseReads++;
                if (content === false) throw httpError;
                return content;
              },
            };
          }),
        };
        const state = serviceState(
          parsed,
          (type) => {
            assert.equal(
              type,
              'Symfony\\Contracts\\HttpClient\\HttpClientInterface',
              'inject Symfony HttpClientInterface',
            );
            return client;
          },
          {
            statics: {
              'Shopware\\Core\\Framework\\Feature': {
                isActive: phpCallable(['featureName'], (flag) => {
                  assert.equal(flag, 'v6.8.0.0', 'use the registered four-part major flag');
                  return active;
                }),
              },
            },
            functions: {
              file_get_contents: phpCallable(['filename'], (actualUrl) => {
                assert.equal(actualUrl, url);
                legacy++;
                return content;
              }),
            },
            constructors: {
              RuntimeException: phpCallable(['message'], (message) => {
                const error = new Error(message);
                error.name = 'RuntimeException';
                return error;
              }),
            },
          },
        );
        const fetch = () => methodValue(state, 'fetch', [url]);
        if (content !== false) assert.equal(fetch(), content, 'return the selected implementation response');
        else
          assert.throws(
            fetch,
            (error) => {
              // An unsupported failure branch must stay infrastructure, too.
              if (error instanceof UnsupportedPhp) throw error;
              return active
                ? error === httpError
                : error?.name === 'RuntimeException' && error.message === `Could not fetch snippet from ${url}`;
            },
            'preserve the error contract of the selected path',
          );
        assert.equal(requests, active ? 1 : 0, 'HTTP path only when the flag is active');
        assert.equal(responseReads, active ? 1 : 0, 'consume the HTTP response');
        assert.equal(legacy, active ? 0 : 1, 'legacy path only when the flag is inactive');
      }
    }
  });
}
