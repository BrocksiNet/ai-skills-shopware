# When stuck: the escalation ladder

Load this when an approach keeps failing, a fix does not work, or you are
looping. The goal is to converge or escalate — never thrash.

## Ladder (in order)

1. **Re-read the owning skill reference.** The rule you need is probably already
   written (DAL, cache, migrations, testing). Re-read it before improvising.
2. **Check the installed core source.** Open the actual class/method in
   `vendor/shopware/...` at the project version. Assumptions about signatures and
   behavior are the usual culprit.
3. **Run a focused verification.** PHPStan on the file, or the single relevant
   test. Let the tool tell you what is wrong instead of guessing.
4. **Reduce the problem.** Reproduce with the smallest possible case; isolate the
   failing layer (DAL vs cache vs DI vs serialization).
5. **Stop and ask the user.** After ~2-3 genuine attempts without progress, do
   NOT keep trying variations. Summarize crisply and ask.

## What "stop and ask" looks like

A good escalation message contains:

- What you are trying to do (one line).
- What you tried (the 2-3 approaches) and the exact error/behavior each produced.
- Your current hypothesis and the specific decision or info you need from the user.

Bad: silently trying a 6th variation, or asking a vague "it doesn't work, help?".

## Anti-patterns to avoid

- Repeating the same fix hoping for a different result.
- Inventing a method/service that "should" exist instead of checking.
- Suppressing errors (empty catch, `@`, baseline entry) to make red go green.
- Expanding scope to route around the blocker without flagging it.

## Done

- [ ] You climbed the ladder (reference -> source -> verify -> reduce) before escalating.
- [ ] If unresolved, you stopped and asked with a crisp, specific summary.
