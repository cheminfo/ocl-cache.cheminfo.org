import { join } from 'node:path';

import { pool, waitForCapacity } from '../calculate/pool.ts';

import type { QueryKind } from './parseQuery.ts';
import type { ParsedQueryIdCode } from './parseQueryTask.ts';

const TASK = join(import.meta.dirname, 'parseQueryTask.ts');

/**
 * A molfile of a few thousand atoms still reads in milliseconds, so a query
 * that has not been read by now is one no answer is coming for.
 */
const PARSE_TIMEOUT = 20_000;

/**
 * Read a query into its idCode, off the event loop.
 * @param input - the query as the caller typed it
 * @param kind - the notation, when the caller already knows it
 * @returns the idCode and the notation the query was written in
 * @throws {Error} When the string is not a molecule in any of the notations.
 */
export async function parseQueryInWorker(
  input: string,
  kind?: QueryKind,
): Promise<ParsedQueryIdCode> {
  await waitForCapacity();

  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), PARSE_TIMEOUT);
  try {
    return (await pool.run(
      { input, kind },
      { filename: TASK, signal: abortController.signal },
    )) as ParsedQueryIdCode;
  } finally {
    clearTimeout(timeout);
  }
}
