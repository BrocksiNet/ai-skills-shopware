# shopware-api-index

The `shopware-api` command of
[ai-skills-shopware](https://github.com/BrocksiNet/ai-skills-shopware), for use
without the skills. One bundled file, no dependencies, Node 26 or newer.

```bash
# What a branch of a shopware/shopware clone breaks against trunk
npx shopware-api-index diff --repo . --base origin/trunk --head HEAD

# The same between two releases, from the published index (no clone needed)
npx shopware-api-index diff --base 6.6.10.4 --head 6.7.0.0

# Which Shopware APIs a plugin uses that some release of its range lacks
npx shopware-api-index facts path/to/plugin

# Only the lines a change adds
git diff | npx shopware-api-index facts --diff - path/to/plugin
```

`npx shopware-api-index --help` lists every option.

## Output

- The second line is a summary, such as `Summary: 3 breaking changes, 2 new deprecations`.
- Every item carries `[file:line]` when the line is known (clone mode).
- `diff` exits with 3 when it finds a break, 0 when it finds none, 2 on a
  usage error and 1 on any other error. `facts` exits with 0 on a report.

## Where the data comes from

Release mode downloads the index the repository builds every Monday from
every Shopware 6.5+ tag and trunk, and caches it under
`~/.cache/ai-skills-shopware/api-index/`. Clone mode (`--repo`) reads the
refs from your clone instead and needs no download.

`diff` covers routes, entity fields, feature flags, configuration keys,
admin, storefront, Twig and build surfaces. PHP signatures are left out by
default, because core's own BC check covers them; `--surface php` adds them.

## License

MIT. The bundle includes php-parser (BSD-3-Clause), @babel/parser (MIT) and
yaml (ISC); their notices are in the file header.
