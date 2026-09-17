/** One bar: where it stands, what it is called, and how tall it is. */
export interface CountBar {
  /** Where the bar stands on the horizontal axis. */
  position: number;
  /** What the readout calls it. */
  label: string;
  /** How many molecules it counts. */
  count: number;
}

/**
 * Bucket counts as bars standing at the middle of each bucket.
 * @param buckets - the histogram from the rollup
 * @returns the bars, empty tails trimmed
 */
export function barsOfHistogram(
  buckets: ReadonlyArray<{ from: number; to: number; count: number }>,
): CountBar[] {
  const trimmed = trimEmptyEdges(buckets);
  const bars = new Array<CountBar>(trimmed.length);
  for (let i = 0; i < trimmed.length; i++) {
    const bucket = trimmed[i];
    if (bucket === undefined) continue;
    const middle = (bucket.from + bucket.to) / 2;
    bars[i] = {
      position: middle,
      label: `${format(bucket.from)} to ${format(bucket.to)}`,
      count: bucket.count,
    };
  }
  return bars;
}

/**
 * Exact value counts as bars.
 * @param counts - the value counts from the rollup
 * @returns the bars
 */
export function barsOfValues(
  counts: ReadonlyArray<{ value: number; count: number }>,
): CountBar[] {
  const bars = new Array<CountBar>(counts.length);
  for (let i = 0; i < counts.length; i++) {
    const entry = counts[i];
    if (entry === undefined) continue;
    bars[i] = {
      position: entry.value,
      label: String(entry.value),
      count: entry.count,
    };
  }
  return bars;
}

/**
 * Drop the empty buckets at both ends, so a histogram sized for every molecule
 * still reads when the cache holds only small ones.
 * @param buckets - the histogram
 * @returns the buckets between the first and last that counted anything
 */
function trimEmptyEdges<T extends { count: number }>(
  buckets: readonly T[],
): T[] {
  let first = 0;
  let last = buckets.length - 1;
  while (first <= last && (buckets[first]?.count ?? 0) === 0) first++;
  while (last >= first && (buckets[last]?.count ?? 0) === 0) last--;
  return buckets.slice(first, last + 1);
}

function format(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
