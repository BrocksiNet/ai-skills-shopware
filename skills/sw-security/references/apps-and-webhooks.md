# Apps and webhooks

## Manifest permissions

- Request **only** permissions the app needs (read vs write per entity).
  Each privilege element names one entity: `<read>product</read>`, not
  `<read>product:read</read>`.
- Avoid `<create>all</create>` / broad wildcards unless the app truly requires them.

## Webhooks

- **SEC-006** Verify **signature** on incoming webhook requests per Shopware app docs.
- Do not log raw signing secrets or full signed payloads with secrets.

## Registration

- App URL and secret live in env / secure config on the app backend — not in the
  shop's committed config beyond what `manifest.xml` requires.

## Cross-skill

Full app lifecycle → `sw-app-development` → `manifest-and-permissions.md`.

## Eval

`app-manifest-least-privilege` — fixture manifest with over-broad permissions.
