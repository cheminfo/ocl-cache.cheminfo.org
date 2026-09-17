import type { LookupResponse, QueryKind, StatsResponse } from './types.ts';

/**
 * Look one molecule up, however its structure is written.
 * @param query - SMILES, molfile or idCode
 * @param options - how to read it, and whether a miss may be computed
 * @param options.kind - the notation, when the caller knows it
 * @param options.cacheOnly - whether a miss returns nothing instead of being computed
 * @param options.signal - aborts the request when the query moves on
 * @returns the molecule information, and whether it was already cached
 */
export async function lookupMolecule(
  query: string,
  options: {
    kind?: QueryKind;
    cacheOnly?: boolean;
    signal?: AbortSignal;
  } = {},
): Promise<LookupResponse> {
  const params = new URLSearchParams({ q: query });
  if (options.kind) params.set('kind', options.kind);
  if (options.cacheOnly) params.set('cacheOnly', 'true');
  return request<LookupResponse>(`/v1/lookup?${params}`, options.signal);
}

/**
 * Read the figures describing the whole cache.
 * @param signal - aborts the request when the page is left
 * @returns the live total and the last rollup
 */
export async function fetchStats(signal?: AbortSignal): Promise<StatsResponse> {
  return request<StatsResponse>('/v1/stats', signal);
}

/**
 * One request, with the server's own message kept when it sends one.
 * @param url - the address to fetch
 * @param signal - aborts the request
 * @returns the parsed body
 * @throws {Error} When the server answers with an error status.
 */
async function request<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error(await messageOf(response));
  }
  return (await response.json()) as T;
}

/**
 * What went wrong, in the server's words when it gave any.
 * @param response - the failed response
 * @returns a line to show the reader
 */
async function messageOf(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { message?: string };
    if (typeof body.message === 'string' && body.message !== '') {
      return body.message;
    }
  } catch {
    // A body that is not JSON says nothing useful; the status does.
  }
  return `the server answered ${response.status}`;
}
