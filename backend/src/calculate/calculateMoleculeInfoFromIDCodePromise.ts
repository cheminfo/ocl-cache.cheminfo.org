import type { MoleculeInfo } from '../MoleculeInfo.ts';

import calculateMoleculeInfoFromIDCode from './calculateMoleculeInfoFromIDCode.ts';
import { pool, waitForCapacity } from './pool.ts';

const COMPUTE_TIMEOUT = 60_000;

/**
 * Multithread async function to calculate the information of a molecule from its idCode
 * @param idCode - idCode of the molecule
 * @returns result to be imported
 */
export default async function calculateMoleculeInfoFromIDCodePromise(
  idCode: string,
): Promise<{ promise: Promise<MoleculeInfo> }> {
  const abortController = new AbortController();

  // Returning an object holding the promise is what gives the caller back
  // pressure: this await does not resolve while the pool's queue is full, so a
  // producer reading a stream stops reading rather than queueing every entry.
  await waitForCapacity();

  const timeout = setTimeout(() => abortController.abort(), COMPUTE_TIMEOUT);
  let promise;
  try {
    promise = (
      pool.run(idCode, {
        signal: abortController.signal,
      }) as Promise<MoleculeInfo>
    ).finally(() => {
      clearTimeout(timeout);
    });
  } catch {
    // it takes too long
    promise = Promise.resolve(
      calculateMoleculeInfoFromIDCode(idCode, { ignoreTautomer: true }),
    );
  }

  return { promise };
}
