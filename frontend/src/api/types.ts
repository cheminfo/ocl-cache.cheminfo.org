/** Molecule information, exactly as `/v1/lookup` returns it. */
export interface MoleculeInfo {
  mf: string;
  mw: number;
  em: number;
  charge: number;
  idCode: string;
  noStereoID: string;
  noStereoTautomerID: string;
  failedTautomerID: number;
  ssIndex: number[];
  logS: number;
  logP: number;
  acceptorCount: number;
  donorCount: number;
  stereoCenterCount: number;
  rotatableBondCount: number;
  polarSurfaceArea: number;
  nbFragments: number;
  unsaturation?: number;
  atoms: Record<string, number>;
  /** Unix seconds, or null for a molecule cached before the date was kept. */
  createdAt: number | null;
}

/** How a query string was read. */
export type QueryKind = 'smiles' | 'molfile' | 'idCode';

/** What `/v1/lookup` answers. */
export interface LookupResponse {
  result: MoleculeInfo | null;
  cached: boolean;
  kind: QueryKind;
}

/** One bar of a histogram. */
export interface HistogramBucket {
  from: number;
  to: number;
  count: number;
}

/** How many molecules carry one exact value. */
export interface ValueCount {
  value: number;
  count: number;
}

/** Everything the statistics page draws. */
export interface CacheStats {
  total: number;
  dated: number;
  undated: number;
  distinctNoStereoID: number;
  distinctNoStereoTautomerID: number;
  failedTautomerID: number;
  perMonth: Array<{ month: string; count: number }>;
  histograms: {
    mw: HistogramBucket[];
    logP: HistogramBucket[];
    logS: HistogramBucket[];
    polarSurfaceArea: HistogramBucket[];
  };
  counts: {
    charge: ValueCount[];
    nbFragments: ValueCount[];
    stereoCenterCount: ValueCount[];
    rotatableBondCount: ValueCount[];
    donorCount: ValueCount[];
    acceptorCount: ValueCount[];
    unsaturation: ValueCount[];
  };
  elements: Array<{ symbol: string; molecules: number }>;
  topFormulas: Array<{ mf: string; count: number }>;
  mass: {
    min: number | null;
    max: number | null;
    mean: number | null;
    counted: number;
  };
  lipinski: { pass: number; fail: number; judged: number };
}

/** What `/v1/stats` answers. */
export interface StatsResponse {
  /** Molecules cached right now, always current. */
  total: number;
  /** The last rollup, or null when none has run yet. */
  snapshot: {
    computedAt: number;
    durationMs: number;
    scanned: number;
    stats: CacheStats;
  } | null;
}
