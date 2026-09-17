import type { HistogramBucket, ValueCount } from './types.ts';

/**
 * Fixed-width bucket counts over a known range.
 *
 * Values below the range land in the first bucket and values above it in the
 * last, so a long tail is shown as a tail rather than dropped.
 */
export class Histogram {
  readonly #from: number;
  readonly #width: number;
  readonly #counts: Float64Array;

  /**
   * @param from - lower edge of the first bucket
   * @param to - upper edge of the last bucket
   * @param width - width of each bucket
   */
  constructor(from: number, to: number, width: number) {
    this.#from = from;
    this.#width = width;
    this.#counts = new Float64Array(Math.ceil((to - from) / width));
  }

  /**
   * Count one value.
   * @param value - the value to place in a bucket
   */
  add(value: number): void {
    let index = Math.floor((value - this.#from) / this.#width);
    if (index < 0) index = 0;
    if (index >= this.#counts.length) index = this.#counts.length - 1;
    this.#counts[index] = (this.#counts[index] ?? 0) + 1;
  }

  /**
   * The buckets, in order.
   * @returns one entry per bucket, including the empty ones
   */
  toBuckets(): HistogramBucket[] {
    const buckets = new Array<HistogramBucket>(this.#counts.length);
    for (let i = 0; i < this.#counts.length; i++) {
      buckets[i] = {
        from: this.#from + i * this.#width,
        to: this.#from + (i + 1) * this.#width,
        count: this.#counts[i] ?? 0,
      };
    }
    return buckets;
  }
}

/**
 * Counts of a whole-number property whose values are small and few.
 *
 * Anything outside `0..max` is gathered into `max`, so a molecule with four
 * hundred rotatable bonds cannot allocate four hundred buckets.
 */
export class ValueCounter {
  readonly #counts: Float64Array;
  readonly #offset: number;

  /**
   * @param min - the lowest value counted on its own
   * @param max - the highest value counted on its own
   */
  constructor(min: number, max: number) {
    this.#offset = min;
    this.#counts = new Float64Array(max - min + 1);
  }

  /**
   * Count one value.
   * @param value - the value to count
   */
  add(value: number): void {
    let index = value - this.#offset;
    if (index < 0) index = 0;
    if (index >= this.#counts.length) index = this.#counts.length - 1;
    this.#counts[index] = (this.#counts[index] ?? 0) + 1;
  }

  /**
   * The counts, dropping values nothing carried.
   * @returns one entry per value seen, in ascending order
   */
  toValueCounts(): ValueCount[] {
    const result: ValueCount[] = [];
    for (let i = 0; i < this.#counts.length; i++) {
      const count = this.#counts[i] ?? 0;
      if (count > 0) result.push({ value: i + this.#offset, count });
    }
    return result;
  }
}
