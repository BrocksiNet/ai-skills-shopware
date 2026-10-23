# Secrets and configuration

## Never in git

- Sales channel **access key** (`sw-access-key`, `SW_ACCESS_KEY`, hex keys in PHP/JS/TS)
- App **secret**, registration credentials, webhook signing secrets
- Admin user passwords, integration API keys, private keys

## Do

- Read from **environment** (`getenv`, `%env()%`, `.env.local` not committed).
- Use **placeholders** in docs, skills, and committed fixtures (`YOUR_ACCESS_KEY`).
- Add `.env`, `.env.local`, `auth.json` to `.gitignore`.
- Rotate keys if accidentally committed — do not “fix” by renaming only.

## Local dev / MCP

- `.mcp.json`, proxy configs, and Cursor MCP headers may hold real keys **locally**.
- Do not copy those values into PRs, skills, or support tickets.
- See `docs/tooling-stack.md` for team proxy setup.

## Eval

`no-access-key-in-source` — grader fails on hardcoded access-key patterns in PHP.
