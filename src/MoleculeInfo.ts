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
  'ssIndex' | 'atoms' | 'unsaturation'
> & {
  atoms: Uint8Array;
  ssIndex: Uint8Array;
  // SQLite stores the absent value as NULL; node:sqlite refuses to bind undefined.
  unsaturation: number | null;
};

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

export type DBMoleculeInfo = MoleculeRow & SSIndexColumns;
