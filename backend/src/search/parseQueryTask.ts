import type { QueryKind } from './parseQuery.ts';
import { parseQuery } from './parseQuery.ts';

/** A query handed to the pool to be read. */
export interface ParseQueryTask {
  /** The query as the caller typed it. */
  input: string;
  /** The notation, when the caller already knows it. */
  kind?: QueryKind;
}

/** What reading a query yields, in a shape a worker can post back. */
export interface ParsedQueryIdCode {
  /** The canonical idCode of the molecule the query described. */
  idCode: string;
  /** How the query turned out to be written. */
  kind: QueryKind;
}

/**
 * Read a query into its idCode, in a worker thread.
 *
 * A `Molecule` cannot cross a thread boundary, and nothing downstream needs
 * one: the cache is keyed by idCode, and a miss is computed from the idCode
 * alone.
 * @param task - the query and, when known, its notation
 * @returns the idCode and the notation the query was written in
 */
export default function parseQueryTask({
  input,
  kind,
}: ParseQueryTask): ParsedQueryIdCode {
  const { molecule, kind: resolved } = parseQuery(input, kind);
  return { idCode: molecule.getIDCode(), kind: resolved };
}
