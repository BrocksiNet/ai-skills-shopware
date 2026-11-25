// Sequential and bounded-concurrency async work.

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

/** Runs `step` for each item with at most `concurrency` in flight at once,
 *  returning results in item order. Falls back to `inSeries` when `concurrency <= 1`. */
export async function inPool<T, R>(
  items: readonly T[],
  concurrency: number,
  step: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  if (concurrency <= 1 || items.length <= 1) return inSeries(items, step);
  const results: R[] = [];
  const iterator = items.entries();
  const worker = async (): Promise<void> => {
    const next = iterator.next();
    if (next.done === true) return;
    const [index, item] = next.value;
    results[index] = await step(item, index);
    await worker();
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));
  return results;
}
