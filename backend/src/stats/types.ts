/** One bar of a histogram: how many molecules fell in `[from, to)`. */
export interface HistogramBucket {
  /** Lower edge, inclusive. */
  from: number;
  /** Upper edge, exclusive. */
  to: number;
  /** How many molecules fell in the bucket. */
  count: number;
}

/** How many molecules carry one exact value of a small whole-number property. */
export interface ValueCount {
  /** The value counted. */
  value: number;
  /** How many molecules carry it. */
  count: number;
}

/** How many molecules the cache took in during one month. */
export interface MonthCount {
  /** The month, as `YYYY-MM`. */
  month: string;
  /** How many molecules were written that month. */
  count: number;
}

/** How many molecules contain one element. */
export interface ElementCount {
  /** The element symbol. */
  symbol: string;
  /** How many molecules contain it at least once. */
  molecules: number;
}

/** How many molecules share one molecular formula. */
export interface FormulaCount {
  /** The formula, as the cache stores it. */
  mf: string;
  /** How many molecules have it. */
  count: number;
}

/** The smallest, largest and mean of a numeric property. */
export interface RangeSummary {
  /** The smallest value seen, or null when nothing was measured. */
  min: number | null;
  /** The largest value seen, or null when nothing was measured. */
  max: number | null;
  /** The mean of the values seen, or null when nothing was measured. */
  mean: number | null;
  /** How many molecules carried the property at all. */
  counted: number;
}

/**
 * Everything the statistics page shows, computed by one background pass.
 *
 * It is stored as JSON in the single row of the `stats` table, so the page
 * costs one read rather than a dozen full scans of `molecules`.
 */
export interface CacheStats {
  /** How many molecules the cache holds. */
  total: number;
  /** How many carry the date they were cached on. */
  dated: number;
  /**
   * How many predate the `createdAt` column and so have no date. They are
   * counted rather than given a guessed one.
   */
  undated: number;
  /** Distinct structures once stereochemistry is dropped. */
  distinctNoStereoID: number;
  /** Distinct structures once stereochemistry and tautomerism are dropped. */
  distinctNoStereoTautomerID: number;
  /** How many molecules the tautomer canonicalisation gave up on. */
  failedTautomerID: number;
  /** How many molecules arrived each month, oldest first. */
  perMonth: MonthCount[];
  /** The continuous properties, as bucket counts. */
  histograms: {
    /** Molecular weight. */
    mw: HistogramBucket[];
    /** Predicted logP. */
    logP: HistogramBucket[];
    /** Predicted logS. */
    logS: HistogramBucket[];
    /** Polar surface area. */
    polarSurfaceArea: HistogramBucket[];
  };
  /** The whole-number properties, as exact value counts. */
  counts: {
    /** Net charge. */
    charge: ValueCount[];
    /** Number of disconnected fragments. */
    nbFragments: ValueCount[];
    /** Number of stereocentres. */
    stereoCenterCount: ValueCount[];
    /** Number of rotatable bonds. */
    rotatableBondCount: ValueCount[];
    /** Number of hydrogen-bond donors. */
    donorCount: ValueCount[];
    /** Number of hydrogen-bond acceptors. */
    acceptorCount: ValueCount[];
    /** Degree of unsaturation. */
    unsaturation: ValueCount[];
  };
  /** Which elements the cache contains, most common first. */
  elements: ElementCount[];
  /** The most frequent molecular formulas. */
  topFormulas: FormulaCount[];
  /** Molecular weight across the whole cache. */
  mass: RangeSummary;
  /** How many molecules satisfy Lipinski's rule of five. */
  lipinski: {
    /** Molecules breaking no more than one of the four criteria. */
    pass: number;
    /** Molecules breaking two or more. */
    fail: number;
    /** Molecules carrying all four properties, so they could be judged. */
    judged: number;
  };
}

/** A rollup with the moment it was computed. */
export interface StatsSnapshot {
  /** When the pass ran, in unix seconds. */
  computedAt: number;
  /** How long it took, in milliseconds. */
  durationMs: number;
  /** How many molecules it read. */
  scanned: number;
  /** The figures themselves. */
  stats: CacheStats;
}
