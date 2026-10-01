/** A numeric column a visitor may bound, and how far it may be bounded. */
export interface NumericFilter {
  /** The column in `molecules`. */
  column: string;
  /** What the parameter is called in the query string. */
  name: string;
  /** What it is, for the API documentation. */
  label: string;
}

/**
 * The columns a browse may filter on.
 *
 * Only columns the cache already stores and already indexes well enough to
 * read: every one of them is a plain scalar on `molecules`, so a filter is a
 * comparison SQLite can apply while it walks rowids, never a second pass.
 */
export const NUMERIC_FILTERS: readonly NumericFilter[] = [
  { column: 'mw', name: 'mw', label: 'molecular weight' },
  { column: 'em', name: 'em', label: 'monoisotopic mass' },
  { column: 'logP', name: 'logP', label: 'logP' },
  { column: 'logS', name: 'logS', label: 'logS' },
  { column: 'polarSurfaceArea', name: 'psa', label: 'polar surface area' },
  {
    column: 'acceptorCount',
    name: 'acceptors',
    label: 'hydrogen-bond acceptors',
  },
  { column: 'donorCount', name: 'donors', label: 'hydrogen-bond donors' },
  { column: 'rotatableBondCount', name: 'rotatable', label: 'rotatable bonds' },
  {
    column: 'stereoCenterCount',
    name: 'stereocentres',
    label: 'stereocentres',
  },
  { column: 'nbFragments', name: 'fragments', label: 'fragments' },
  { column: 'charge', name: 'charge', label: 'net charge' },
  { column: 'unsaturation', name: 'unsaturation', label: 'unsaturation' },
];

/** What a browse is filtered by. */
export interface PropertyFilters {
  /** Bounds per filter name: `{ mw: { min, max } }`. */
  ranges: Record<string, { min?: number; max?: number }>;
  /** An exact molecular formula, or undefined. */
  mf?: string;
}

/** A WHERE clause and the named parameters it binds. */
export interface FilterSql {
  /** The clause, without `WHERE`, or `'1'` when nothing is filtered. */
  where: string;
  /** The named parameters, as `openchemlib-sqlite` requires for a subquery. */
  params: Record<string, number | string>;
  /** Whether anything is actually filtered. */
  isEmpty: boolean;
}

/**
 * Turn the filters into SQL.
 *
 * Named parameters, never interpolation: the values come from a query string,
 * and the only safe place for one is a bound parameter. The column names are
 * not interpolated either — they come from {@link NUMERIC_FILTERS}, which is a
 * literal in this file.
 * @param filters - what to bound
 * @returns the clause and its parameters
 */
export function filterSql(filters: PropertyFilters): FilterSql {
  const clauses: string[] = [];
  const params: Record<string, number | string> = {};

  for (const filter of NUMERIC_FILTERS) {
    const range = filters.ranges[filter.name];
    if (range === undefined) continue;
    if (range.min !== undefined) {
      const key = `${filter.name}Min`;
      clauses.push(`${filter.column} >= :${key}`);
      params[key] = range.min;
    }
    if (range.max !== undefined) {
      const key = `${filter.name}Max`;
      clauses.push(`${filter.column} <= :${key}`);
      params[key] = range.max;
    }
  }

  if (filters.mf !== undefined && filters.mf !== '') {
    clauses.push('mf = :mf');
    params.mf = filters.mf;
  }

  return {
    where: clauses.length > 0 ? clauses.join(' AND ') : '1',
    params,
    isEmpty: clauses.length === 0,
  };
}

/**
 * Read the filters out of a query string.
 *
 * A bound that is not a number is dropped rather than refused: a browse link
 * written before a filter was renamed must still open, which is the same rule
 * the share vocabulary follows.
 * @param query - the request's query string, already parsed
 * @returns what to filter by
 */
export function readFilters(query: Record<string, unknown>): PropertyFilters {
  const ranges: Record<string, { min?: number; max?: number }> = {};

  for (const filter of NUMERIC_FILTERS) {
    const min = finiteNumber(query[`${filter.name}Min`]);
    const max = finiteNumber(query[`${filter.name}Max`]);
    if (min === undefined && max === undefined) continue;
    ranges[filter.name] = {
      ...(min === undefined ? {} : { min }),
      ...(max === undefined ? {} : { max }),
    };
  }

  const mf = typeof query.mf === 'string' ? query.mf.trim() : '';
  return { ranges, ...(mf === '' ? {} : { mf }) };
}

/**
 * A query-string value as a number, when it is one.
 * @param value - what the query string carried
 * @returns the number, or undefined when it is not one
 */
function finiteNumber(value: unknown): number | undefined {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined;
  }
  if (typeof value !== 'string' || value.trim() === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}
