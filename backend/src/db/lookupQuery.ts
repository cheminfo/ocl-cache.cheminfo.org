import type {
  CachedMoleculeInfo,
  LookupOptions,
  MoleculeLookup,
} from '../MoleculeInfo.ts';
import { POOL_THREADS } from '../calculate/pool.ts';
import type { QueryKind } from '../search/parseQuery.ts';
import { parseQueryInWorker } from '../search/parseQueryInWorker.ts';

import type { DB } from './DB.ts';
import { getInfoForIdCode } from './getInfoForIdCode.ts';

/** How a query is read, on top of what a lookup does with a miss. */
export interface QueryLookupOptions extends LookupOptions {
  /** The notation, when the caller already knows it. */
  kind?: QueryKind;
}

/** One query's answer, as the batch route reports it. */
export interface QueryLookupResult {
  /** The query, echoed so a caller can line answers up with what it sent. */
  query: string;
  /** The information, or null on a miss the caller forbade computing. */
  result: CachedMoleculeInfo | null;
  /** Whether it came from the cache rather than being computed now. */
  cached: boolean;
  /** How the query was read, absent when it could not be read at all. */
  kind?: QueryKind;
  /** Why the query could not be read, absent when it could. */
  error?: string;
}

/** A query once it has been read, or the reason it could not be. */
type ParsedEntry =
  | { query: string; idCode: string; kind: QueryKind }
  | { query: string; error: string };

/**
 * Look one query up, whichever notation it is written in.
 *
 * The openchemlib parse runs in a worker: at about 226 µs for a drug-like
 * SMILES it is some twenty-four times the cost of the row lookup it leads to,
 * and on the event loop it would be what caps the whole server.
 * @param query - the query as the caller typed it
 * @param db - the database to read
 * @param options - the notation, and whether a miss may be computed
 * @returns the information, how the query was read, and where it came from
 */
export async function lookupQuery(
  query: string,
  db: DB,
  options: QueryLookupOptions = {},
): Promise<QueryLookupResult> {
  const { idCode, kind } = await parseQueryInWorker(query, options.kind);
  const { info, cached } = await getInfoForIdCode(idCode, db, options);
  return { query, result: info, cached, kind };
}

/**
 * Look several queries up, a poolful at a time.
 *
 * Queries are read first and resolved afterwards, so a structure a batch names
 * twice — under two spellings, even — is computed once rather than twice. The
 * row a miss writes is only queued, so a second occurrence would otherwise not
 * find it and would compute it again.
 * @param queries - the queries as the caller sent them
 * @param db - the database to read
 * @param options - the notation, and whether a miss may be computed
 * @returns one answer per query, in the order they were sent
 */
export async function lookupQueries(
  queries: string[],
  db: DB,
  options: QueryLookupOptions = {},
): Promise<QueryLookupResult[]> {
  const parsed = await mapInChunks(queries, (query) =>
    readQuery(query, options.kind),
  );

  const wanted = new Set<string>();
  for (const entry of parsed) {
    if ('idCode' in entry) wanted.add(entry.idCode);
  }

  const found = new Map<string, MoleculeLookup>(
    await mapInChunks(
      [...wanted],
      async (idCode) =>
        [idCode, await getInfoForIdCode(idCode, db, options)] as const,
    ),
  );

  return parsed.map((entry) => {
    if ('error' in entry) {
      return {
        query: entry.query,
        result: null,
        cached: false,
        error: entry.error,
      };
    }
    const lookup = found.get(entry.idCode);
    return {
      query: entry.query,
      result: lookup?.info ?? null,
      cached: lookup?.cached ?? false,
      kind: entry.kind,
    };
  });
}

/**
 * Read one query, reporting a failure rather than throwing it.
 * @param query - the query as the caller typed it
 * @param kind - the notation, when the caller already knows it
 * @returns the idCode and notation, or why the query could not be read
 */
async function readQuery(
  query: string,
  kind: QueryKind | undefined,
): Promise<ParsedEntry> {
  try {
    const { idCode, kind: resolved } = await parseQueryInWorker(query, kind);
    return { query, idCode, kind: resolved };
  } catch (error: unknown) {
    return {
      query,
      error:
        error instanceof Error
          ? error.message
          : 'that is not a molecule in any notation',
    };
  }
}

/**
 * Run an asynchronous step over every item, a poolful at a time.
 *
 * The chunking is what keeps a thousand-query request from filling the pool's
 * queue with work nobody is waiting on yet.
 * @param items - what to run over
 * @param run - the step, run concurrently within a chunk
 * @returns the results, in the order the items were given
 */
async function mapInChunks<T, R>(
  items: T[],
  run: (item: T) => Promise<R>,
): Promise<R[]> {
  const chunkSize = POOL_THREADS * 2;
  const results: R[] = [];

  for (let start = 0; start < items.length; start += chunkSize) {
    const answers = await Promise.all(
      items.slice(start, start + chunkSize).map((item) => run(item)),
    );
    results.push(...answers);
  }

  return results;
}
