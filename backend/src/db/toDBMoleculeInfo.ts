import { serialize } from 'bson';

import type {
  DBMoleculeInfo,
  MoleculeInfo,
  SSIndexColumns,
} from '../MoleculeInfo.ts';

/**
 * Turn computed information into the row the `molecules` table takes.
 *
 * Two values do not go in as they come out of the calculation: `atoms` is an
 * object and is stored as BSON, and `ssIndex` is stored twice — once as the blob
 * that is read back, and once as the eight int64 columns backing the composite
 * index.
 * @param info - the computed properties
 * @param createdAt - the insertion time to record, in unix seconds
 * @returns the row, ready to bind to the insert statement
 */
export function toDBMoleculeInfo(
  info: MoleculeInfo,
  createdAt: number,
): DBMoleculeInfo {
  const ssIndex = Int32Array.from(info.ssIndex);
  const ssIndex64 = new BigInt64Array(ssIndex.buffer);

  const ssIndexes = {} as SSIndexColumns;
  for (let i = 0; i < 8; i++) {
    ssIndexes[`ssIndex${i}` as keyof SSIndexColumns] = ssIndex64[i] ?? 0n;
  }

  return {
    ...info,
    createdAt,
    // node:sqlite refuses to bind undefined
    unsaturation: info.unsaturation ?? null,
    ssIndex: new Uint8Array(ssIndex.buffer),
    atoms: serialize(info.atoms),
    ...ssIndexes,
  };
}

/**
 * The moment a row is recorded as having arrived.
 * @returns the current time in unix seconds
 */
export function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}
