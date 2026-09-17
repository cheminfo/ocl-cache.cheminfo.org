import type {
  AdditiveStats,
  ElementCount,
  HistogramBucket,
  MonthCount,
  RangeSummary,
  ValueCount,
} from './types.ts';

/**
 * Add the figures of one range of molecules to those of another.
 *
 * Every field here is a count, a total or an extreme, so two ranges add to the
 * range covering both. That is what lets a refresh read only the molecules
 * that arrived since the last one instead of the whole table.
 * @param one - the figures counted so far
 * @param other - the figures of the molecules that have arrived since
 * @returns the figures for both together
 */
export function mergeAdditive(
  one: AdditiveStats,
  other: AdditiveStats,
): AdditiveStats {
  return {
    total: one.total + other.total,
    dated: one.dated + other.dated,
    undated: one.undated + other.undated,
    failedTautomerID: one.failedTautomerID + other.failedTautomerID,
    histograms: {
      mw: addBuckets(one.histograms.mw, other.histograms.mw),
      logP: addBuckets(one.histograms.logP, other.histograms.logP),
      logS: addBuckets(one.histograms.logS, other.histograms.logS),
      polarSurfaceArea: addBuckets(
        one.histograms.polarSurfaceArea,
        other.histograms.polarSurfaceArea,
      ),
    },
    counts: {
      charge: addValues(one.counts.charge, other.counts.charge),
      nbFragments: addValues(one.counts.nbFragments, other.counts.nbFragments),
      stereoCenterCount: addValues(
        one.counts.stereoCenterCount,
        other.counts.stereoCenterCount,
      ),
      rotatableBondCount: addValues(
        one.counts.rotatableBondCount,
        other.counts.rotatableBondCount,
      ),
      donorCount: addValues(one.counts.donorCount, other.counts.donorCount),
      acceptorCount: addValues(
        one.counts.acceptorCount,
        other.counts.acceptorCount,
      ),
      unsaturation: addValues(
        one.counts.unsaturation,
        other.counts.unsaturation,
      ),
    },
    elements: addElements(one.elements, other.elements),
    perMonth: addMonths(one.perMonth, other.perMonth),
    mass: addRange(one.mass, other.mass),
    lipinski: {
      pass: one.lipinski.pass + other.lipinski.pass,
      fail: one.lipinski.fail + other.lipinski.fail,
      judged: one.lipinski.judged + other.lipinski.judged,
    },
  };
}

/**
 * Add two histograms bucket by bucket.
 *
 * The edges come from the same fixed table, so the two are the same shape; a
 * stored rollup from an older shape is refused rather than misaligned.
 * @param one - the buckets counted so far
 * @param other - the buckets of the new molecules
 * @returns the buckets for both
 * @throws {Error} When the two were not cut the same way.
 */
function addBuckets(
  one: readonly HistogramBucket[],
  other: readonly HistogramBucket[],
): HistogramBucket[] {
  if (one.length !== other.length) {
    throw new Error('the stored histogram was cut differently; recompute it');
  }
  const merged = new Array<HistogramBucket>(one.length);
  for (let i = 0; i < one.length; i++) {
    const left = one[i];
    const right = other[i];
    if (left === undefined || right === undefined) continue;
    if (left.from !== right.from || left.to !== right.to) {
      throw new Error('the stored histogram was cut differently; recompute it');
    }
    merged[i] = {
      from: left.from,
      to: left.to,
      count: left.count + right.count,
    };
  }
  return merged;
}

function addValues(
  one: readonly ValueCount[],
  other: readonly ValueCount[],
): ValueCount[] {
  const totals = new Map<number, number>();
  for (const entry of one) totals.set(entry.value, entry.count);
  for (const entry of other) {
    totals.set(entry.value, (totals.get(entry.value) ?? 0) + entry.count);
  }
  return [...totals]
    .map(([value, count]) => ({ value, count }))
    .toSorted((left, right) => left.value - right.value);
}

function addElements(
  one: readonly ElementCount[],
  other: readonly ElementCount[],
): ElementCount[] {
  const totals = new Map<string, number>();
  for (const entry of one) totals.set(entry.symbol, entry.molecules);
  for (const entry of other) {
    totals.set(entry.symbol, (totals.get(entry.symbol) ?? 0) + entry.molecules);
  }
  return [...totals]
    .map(([symbol, molecules]) => ({ symbol, molecules }))
    .toSorted((left, right) => right.molecules - left.molecules);
}

function addMonths(
  one: readonly MonthCount[],
  other: readonly MonthCount[],
): MonthCount[] {
  const totals = new Map<string, number>();
  for (const entry of one) totals.set(entry.month, entry.count);
  for (const entry of other) {
    totals.set(entry.month, (totals.get(entry.month) ?? 0) + entry.count);
  }
  return [...totals]
    .map(([month, count]) => ({ month, count }))
    .toSorted((left, right) => left.month.localeCompare(right.month));
}

function addRange(one: RangeSummary, other: RangeSummary): RangeSummary {
  const counted = one.counted + other.counted;
  const sum = one.sum + other.sum;
  return {
    min: smallest(one.min, other.min),
    max: largest(one.max, other.max),
    mean: counted === 0 ? null : sum / counted,
    sum,
    counted,
  };
}

function smallest(one: number | null, other: number | null): number | null {
  if (one === null) return other;
  if (other === null) return one;
  return Math.min(one, other);
}

function largest(one: number | null, other: number | null): number | null {
  if (one === null) return other;
  if (other === null) return one;
  return Math.max(one, other);
}
