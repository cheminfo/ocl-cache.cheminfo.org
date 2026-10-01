import {
  NO_ID_CODE,
  getNoStereoIdCode,
  getNoStereoTautomerIdCode,
} from 'openchemlib-search-wasm';

/**
 * The ceiling on how many tautomers OpenChemLib enumerates for one molecule
 * before it settles for what it has.
 *
 * It replaces the carbon count this cache used to bound the tautomer key with.
 * A size heuristic bounds the wrong thing: the cost is set by how many
 * tautomeric sites a molecule has, so it let a small molecule with many of them
 * run for seconds and refused a large one that would have taken microseconds.
 *
 * It is a work bound and not a clock, so the same molecule reaches it on every
 * machine and the cache holds the same keys wherever a row was written. A time
 * cap would give up on molecules under load that a quiet host keys, and two
 * hosts filling one cache would then disagree about what a compound is.
 *
 * 5000 is `openchemlib-sqlite`'s own default, and matching it is what keeps the
 * idCodes stored here in step with the hashes that library stores for them.
 */
export const MAX_TAUTOMERS = 5000;

/** The canonical forms of a structure, as the cache stores them. */
export interface StructureKeys {
  /** The canonical idCode with stereochemistry disregarded. */
  noStereoID: string;
  /**
   * The canonical idCode with stereochemistry and tautomerism disregarded, or
   * {@link StructureKeys.noStereoID} when there is none — which is what
   * `failedTautomerID` records.
   */
  noStereoTautomerID: string;
  /** Whether the generic tautomer could not be reached. */
  failedTautomerID: 0 | 1;
}

/**
 * The canonical forms of one structure.
 *
 * Both come from `openchemlib-search-wasm`, which canonizes with the canonizer
 * told to disregard stereochemistry rather than by stripping stereo from the
 * molecule first. The distinction is the reason this module exists: stripping
 * turns an unconfigured double bond into a configured one, so a compound drawn
 * without its double-bond stereo keyed differently from the same compound drawn
 * with it — about 1.5% of a drug-like library, and every structure that arrived
 * as a stereo-free SMILES.
 * @param idCode - the molecule to key, as the idCode the row will store
 * @param ignoreTautomer - skip the tautomer form, for a molecule already known
 *   to have run too long
 * @returns the two canonical forms and the tautomer flag
 */
export function structureKeys(
  idCode: string,
  ignoreTautomer = false,
): StructureKeys {
  const noStereoID = getNoStereoIdCode(idCode);
  if (ignoreTautomer || noStereoID === NO_ID_CODE) {
    return withoutTautomer(noStereoID);
  }

  // The caller's buffer is how the module reports the one thing a truncated
  // enumeration cannot be told from a finished one by looking at its answer.
  const tautomerCounts = new Int32Array(1);
  const noStereoTautomerID = getNoStereoTautomerIdCode(idCode, {
    maxTautomers: MAX_TAUTOMERS,
    tautomerCounts,
  });

  // A molecule that reached the ceiling was not enumerated to the end, so its
  // generic tautomer is wherever the search had got to — not the canonical form,
  // and not what another molecule's finished enumeration would be compared
  // against. It has no tautomer form, which is the same answer as a molecule
  // OpenChemLib cannot canonize at all.
  const truncated = (tautomerCounts[0] ?? 0) >= MAX_TAUTOMERS;
  if (truncated || noStereoTautomerID === NO_ID_CODE) {
    return withoutTautomer(noStereoID);
  }

  return { noStereoID, noStereoTautomerID, failedTautomerID: 0 };
}

/**
 * The forms of a molecule whose generic tautomer was not reached.
 * @param noStereoID - the canonical form that stands in for it
 * @returns them, with the no-stereo idCode standing in
 */
function withoutTautomer(noStereoID: string): StructureKeys {
  return {
    noStereoID,
    noStereoTautomerID: noStereoID,
    failedTautomerID: 1,
  };
}
