// Output for the bins. The writers return void, so they fit the `out` and
// `err` callbacks; a bin sets process.exitCode and returns instead of
// calling process.exit, so buffered output is never cut off.

export const stdout = (text: string): void => {
  process.stdout.write(text);
};

export const stderr = (text: string): void => {
  process.stderr.write(text);
};
