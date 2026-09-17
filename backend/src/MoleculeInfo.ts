export interface MoleculeInfo {
  mf: string;
  mw: number;
  em: number;
  charge: number;
  idCode: string;
  noStereoID: string;
  noStereoTautomerID: string;
  failedTautomerID: 0 | 1; // if failed we use noStereoID
  ssIndex: number[];
  logS: number;
  logP: number;
  acceptorCount: number;
  donorCount: number;
  stereoCenterCount: number;
  rotatableBondCount: number;
  polarSurfaceArea: number;
  nbFragments: number;
  unsaturation: number | undefined;
  atoms: Record<string, number>;
}

/**
 * A row of the `molecules` table, without the eight `ssIndexN` columns.
 *
 * Those columns hold arbitrary 64-bit patterns and `node:sqlite` throws when a
 * value exceeds `Number.MAX_SAFE_INTEGER`, so they are never selected — the
 * `ssIndex` blob carries the same data. They exist only to back the composite
 * index used by substructure pre-screening.
 */
export type MoleculeRow = Omit<
  MoleculeInfo,
  'ssIndex' | 'atoms' | 'unsaturation' | 'idCode'
> & {
  atoms: Uint8Array;
  ssIndex: Uint8Array;
  // SQLite stores the absent value as NULL; node:sqlite refuses to bind undefined.
  unsaturation: number | null;
  // Null for every row written before the column existed, which reads as
  // "cached before this was recorded" rather than as a guessed date.
  createdAt: number | null;
  /**
   * `idCode` is declared without a type keyword, so the column takes NUMERIC
   * affinity and an all-digit idCode comes back as a number. It is read as
   * `unknown` here so nothing downstream can use it without converting.
   */
  idCode: unknown;
};

/** Molecule information as the cache holds it, with the date it arrived. */
export interface CachedMoleculeInfo extends MoleculeInfo {
  /**
   * When the molecule was written to the cache, in unix seconds, or null for
   * one cached before the column existed.
   */
  createdAt: number | null;
}

/** What a lookup returns: the information, and where it came from. */
export interface MoleculeLookup {
  /**
   * The molecule information, or null when it was not cached and the caller
   * asked for a cache-only lookup.
   */
  info: CachedMoleculeInfo | null;
  /** Whether it came from the cache rather than being computed on the spot. */
  cached: boolean;
}

/** How a lookup behaves when the molecule is not cached. */
export interface LookupOptions {
  /**
   * Whether a miss returns nothing instead of computing the information and
   * storing it.
   * @default false
   */
  cacheOnly?: boolean;
}

/** The eight int64 columns duplicating `ssIndex`, written but never read back. */
export interface SSIndexColumns {
  ssIndex0: bigint;
  ssIndex1: bigint;
  ssIndex2: bigint;
  ssIndex3: bigint;
  ssIndex4: bigint;
  ssIndex5: bigint;
  ssIndex6: bigint;
  ssIndex7: bigint;
}

export type DBMoleculeInfo = Omit<MoleculeRow, 'idCode'> &
  SSIndexColumns & { idCode: string };
