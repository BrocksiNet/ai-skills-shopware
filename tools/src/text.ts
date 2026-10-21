// Text helpers shared by the tools.

/** Byte order, like jq's sort and `LC_ALL=C sort`. */
export function compareText(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}
