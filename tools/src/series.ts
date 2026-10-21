// Sequential async work. Agent runs share one provider quota and one
// workdir, so they run one after another, never in parallel.

/** Runs `step` for each item in order, each after the previous one has
 *  settled, and returns the results in item order. */
export async function inSeries<T, R>(items: readonly T[], step: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results: R[] = [];
  await items.reduce(async (previous, item, index) => {
    await previous;
    results.push(await step(item, index));
  }, Promise.resolve());
  return results;
}
