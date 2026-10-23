// A minimal GitHub REST and GraphQL client. Callers take the `GitHubApi` or
// `GitHubGraphql` function, so tests pass a stub that answers from recorded
// JSON.
import { envOr } from './env.ts';

/** GET one API path (with its query string) and return the parsed JSON. */
export type GitHubApi = (path: string) => Promise<unknown>;

/** Run one GraphQL query and return its `data`. */
export type GitHubGraphql = (query: string, variables: Record<string, string | null>) => Promise<unknown>;

const PAGE_SIZE = 100;

/** GH_TOKEN, then GITHUB_TOKEN; empty when neither is set. */
export const githubToken = (env: NodeJS.ProcessEnv): string => envOr(env, 'GH_TOKEN', envOr(env, 'GITHUB_TOKEN', ''));

/** Unauthenticated, or with GH_TOKEN / GITHUB_TOKEN when set. */
export function githubApi(env: NodeJS.ProcessEnv): GitHubApi {
  const token = githubToken(env);
  const headers: Record<string, string> = { accept: 'application/vnd.github+json' };
  if (token !== '') headers.authorization = `Bearer ${token}`;
  return async (path) => {
    const response = await fetch(`https://api.github.com/${path}`, { headers });
    if (!response.ok) throw new Error(`GitHub API ${path}: HTTP ${response.status}`);
    const body: unknown = await response.json();
    return body;
  };
}

/** Every item of a list endpoint, one page of 100 after another. */
export async function allPages(api: GitHubApi, path: string, page = 1): Promise<unknown[]> {
  const separator = path.includes('?') ? '&' : '?';
  const body = await api(`${path}${separator}per_page=${PAGE_SIZE}&page=${page}`);
  if (!Array.isArray(body)) throw new Error(`GitHub API ${path}: expected a list`);
  const items: unknown[] = body;
  return items.length < PAGE_SIZE ? items : [...items, ...(await allPages(api, path, page + 1))];
}

type Json = Record<string, unknown>;
const isRecord = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v);

/** GraphQL needs a token; errors in the response body throw. */
export function githubGraphql(token: string): GitHubGraphql {
  if (token === '') throw new Error('GitHub GraphQL needs GH_TOKEN or GITHUB_TOKEN');
  return async (query, variables) => {
    const response = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ query, variables }),
    });
    if (!response.ok) throw new Error(`GitHub GraphQL: HTTP ${response.status}`);
    const body: unknown = await response.json();
    if (!isRecord(body)) throw new Error('GitHub GraphQL: unexpected response');
    if (Array.isArray(body.errors) && body.errors.length > 0) {
      const first: unknown = body.errors[0];
      const message = isRecord(first) && typeof first.message === 'string' ? first.message : 'unknown error';
      throw new Error(`GitHub GraphQL: ${message}`);
    }
    return body.data;
  };
}
