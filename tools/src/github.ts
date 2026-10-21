// A minimal GitHub REST client. Callers take the `GitHubApi` function, so
// tests pass a stub that answers from recorded JSON.
import { envOr } from './env.ts';

/** GET one API path (with its query string) and return the parsed JSON. */
export type GitHubApi = (path: string) => Promise<unknown>;

const PAGE_SIZE = 100;

/** Unauthenticated, or with GH_TOKEN / GITHUB_TOKEN when set. */
export function githubApi(env: NodeJS.ProcessEnv): GitHubApi {
  const token = envOr(env, 'GH_TOKEN', envOr(env, 'GITHUB_TOKEN', ''));
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
