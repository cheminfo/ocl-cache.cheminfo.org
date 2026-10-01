import type {
  LookupResponse,
  QueryKind,
  SearchMode,
  SearchResponse,
  StatsResponse,
} from './types.ts';

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
 * Browse the cache, narrowed by structure and by property.
 * @param options - what to ask for
 * @param options.query - the structure, when one is being filtered on
 * @param options.mode - how that structure is matched
 * @param options.bounds - the numeric bounds, keyed by the filter's name
 * @param options.mf - an exact molecular formula, or the empty string
 * @param options.limit - how many molecules the page holds
 * @param options.cursor - where the page starts, or null for the first
 * @param options.signal - aborts the request when the question moves on
 * @returns the page, and where the next one starts
 */
export async function browseCache(
  options: {
    query?: string;
    mode?: SearchMode;
    bounds?: Record<string, { min?: number; max?: number }>;
    mf?: string;
    limit?: number;
    cursor?: string | null;
    signal?: AbortSignal;
  } = {},
): Promise<SearchResponse> {
  const params = new URLSearchParams();
  if (options.query) params.set('q', options.query);
  if (options.mode) params.set('mode', options.mode);
  if (options.mf) params.set('mf', options.mf);
  if (options.limit !== undefined) params.set('limit', String(options.limit));
  if (options.cursor) params.set('cursor', options.cursor);
  for (const [name, range] of Object.entries(options.bounds ?? {})) {
    if (range.min !== undefined) params.set(`${name}Min`, String(range.min));
    if (range.max !== undefined) params.set(`${name}Max`, String(range.max));
  }
  return request<SearchResponse>(`/v1/search?${params}`, options.signal);
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
