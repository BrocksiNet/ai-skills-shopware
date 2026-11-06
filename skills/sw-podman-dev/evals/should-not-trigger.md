# Should not trigger

- "Write a unit test for ProductEntity" (sw-testing — structure, not execution env)
- "Draft the PR description for shopware/shopware" (sw-pr-description)
- "Is this DAL query idiomatic?" (sw-review-learnings)
- "Add a RELEASE_INFO entry" (sw-core-development)
- "Explain PHP enum syntax" (sw-php-foundation)
- "Interpret this GitHub Actions CI log" (ci-failure-interpretation / gh-tooling context)
- User explicitly says "run on host native PHP without container"
- Tests are green. Open the PR. (-> shopware-pr-hygiene, then sw-change-impact)
- The cart total is wrong for a percentage discount. Fix it in CartProcessor. (-> shopware-php-code)

- Run npm checks for this Nuxt application; it has no Shopware dependencies.
- Validate this Laravel project; composer.json and Docker do not make it a Shopware project.
- Build this Astro website without Shopware tooling.
