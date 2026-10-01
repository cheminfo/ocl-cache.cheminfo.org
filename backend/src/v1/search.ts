import { Type } from '@sinclair/typebox';

import { browseMolecules } from '../db/browseMolecules.ts';
import { getDB } from '../db/dbFactory.ts';
import { parseQueryInWorker } from '../search/parseQueryInWorker.ts';
import {
  NUMERIC_FILTERS,
  filterSql,
  readFilters,
} from '../search/propertyFilter.ts';
import { getSearchIndex } from '../search/searchIndex.ts';
import type { FastifyTyped } from '../types.ts';

import { QueryKindSchema } from './schemas.ts';

/** How many molecules one page holds by default. */
const PAGE_SIZE = 24;

/** The most one page may hold, however a link asks. */
const MAX_PAGE_SIZE = 96;

/**
 * The most matches a structure scan collects before it stops.
 *
 * An exhaustive substructure scan is minutes at this scale — benzene matched
 * 63% of a 400 000-molecule corpus — so a bounded one is what makes the first
 * page cheap: measured, 15 ms against 24 s.
 */
const MAX_SCAN_RESULTS = 1000;

/** How long a scan may run before it answers with what it has. */
const TIMEOUT_MS = 10_000;

/** The search modes the route offers. */
const MODES = [
  'substructure',
  'similarity',
  'exact',
  'exactNoStereo',
  'exactNoStereoTautomer',
] as const;

/** One molecule a search or a browse returned. */
const HitSchema = Type.Object({
  idCode: Type.String({ description: 'OCL idCode of the molecule' }),
  mf: Type.Optional(Type.String({ description: 'Molecular formula' })),
  mw: Type.Optional(Type.Number({ description: 'Molecular weight' })),
  similarity: Type.Optional(
    Type.Number({ description: 'Tanimoto coefficient, similarity mode only' }),
  ),
});

/** The response. */
const SearchResponseSchema = Type.Object({
  results: Type.Array(HitSchema),
  /**
   * How many matched, when that is known without counting. A browse does not
   * count — see the route's own comment.
   */
  total: Type.Union([Type.Number(), Type.Null()]),
  partial: Type.Boolean({
    description: 'Whether the scan stopped before reading every candidate',
  }),
  /** Where the next page starts, or null at the end. */
  next: Type.Union([Type.String(), Type.Null()]),
  screened: Type.Optional(Type.Number()),
  elapsedMs: Type.Optional(Type.Number()),
  kind: Type.Optional(QueryKindSchema),
});

/** The numeric bounds the query string carries, two per filter. */
const rangeProperties = Object.fromEntries(
  NUMERIC_FILTERS.flatMap((filter) => [
    [
      `${filter.name}Min`,
      Type.Optional(Type.Number({ description: `Lowest ${filter.label}` })),
    ],
    [
      `${filter.name}Max`,
      Type.Optional(Type.Number({ description: `Highest ${filter.label}` })),
    ],
  ]),
);

/**
 * Browse the cache, filtered by property, by structure, or by both.
 *
 * With no `q` it is a browse: every molecule, newest last, filtered by whatever
 * bounds the link carries. With a `q` it is a structure search, and the same
 * bounds become the candidate set the scan is restricted to — which is also the
 * cheapest way to run one, since narrowing the candidates is what a scan's cost
 * is made of.
 *
 * **It never counts.** `COUNT(*)` on this table is a walk of 150 million rows,
 * so a browse answers "is there another page" by reading one row more than it
 * was asked for, and `total` is null. A structure scan knows what it matched
 * within its own bound, so it reports that.
 * @param fastify - the instance the route is registered on
 */
export default function search(fastify: FastifyTyped) {
  fastify.get(
    '/search',
    {
      schema: {
        tags: ['search'],
        summary: 'Browse and search the cache by structure and by property',
        querystring: Type.Object({
          q: Type.Optional(
            Type.String({ description: 'SMILES, molfile or idCode' }),
          ),
          kind: QueryKindSchema,
          mode: Type.Optional(
            Type.Union(
              MODES.map((mode) => Type.Literal(mode)),
              { default: 'substructure' },
            ),
          ),
          limit: Type.Optional(
            Type.Integer({
              minimum: 1,
              maximum: MAX_PAGE_SIZE,
              default: PAGE_SIZE,
            }),
          ),
          cursor: Type.Optional(
            Type.String({ description: 'Where the next page starts' }),
          ),
          threshold: Type.Optional(
            Type.Number({ minimum: 0, maximum: 1, default: 0.8 }),
          ),
          mf: Type.Optional(
            Type.String({ description: 'Exact molecular formula' }),
          ),
          ...rangeProperties,
        }),
        response: { 200: SearchResponseSchema },
      },
    },
    async (request, reply) => {
      const {
        q,
        kind,
        mode = 'substructure',
        limit = PAGE_SIZE,
        cursor,
        threshold = 0.8,
      } = request.query;
      const filters = filterSql(readFilters(request.query));
      const page = Math.max(1, Math.min(limit, MAX_PAGE_SIZE));

      if (q === undefined || q.trim() === '') {
        const db = await getDB();
        const after = Number(cursor ?? 0);
        const browse = browseMolecules(
          db,
          filters.where,
          filters.params,
          page,
          Number.isFinite(after) ? after : 0,
        );
        return reply.send({
          results: browse.rows,
          total: null,
          partial: false,
          next: browse.next === null ? null : String(browse.next),
        });
      }

      let parsed;
      try {
        parsed = await parseQueryInWorker(q, kind);
      } catch {
        return reply.badRequest('that is not a molecule in any notation');
      }

      const from = Number(cursor ?? 0);
      const offset = Number.isFinite(from) && from > 0 ? from : 0;
      const { molDB } = getSearchIndex();
      const response = await molDB.search(parsed.idCode, {
        mode,
        format: 'idCode',
        limit: page,
        from: offset,
        similarityThreshold: threshold,
        // Restricting the scan rather than filtering its results: the whole
        // cost of a scan is the candidates it reads, so a bound applied
        // afterwards would have paid for every one of them first.
        ...(filters.isEmpty
          ? {}
          : {
              candidates: {
                sql: `SELECT rowid AS entry_id FROM mol.molecules WHERE ${filters.where}`,
                params: filters.params,
              },
            }),
        maxResults: Math.min(offset + page, MAX_SCAN_RESULTS),
        timeoutMs: TIMEOUT_MS,
      });

      const next = offset + page;
      return reply.send({
        results: response.results.map((hit) => ({
          idCode: hit.idCode,
          ...(hit.mw === undefined ? {} : { mw: hit.mw }),
          ...(hit.similarity === undefined
            ? {}
            : { similarity: hit.similarity }),
        })),
        total: response.total,
        partial: response.partial ?? false,
        next: next < response.total ? String(next) : null,
        ...(response.screened === undefined
          ? {}
          : { screened: response.screened }),
        ...(response.elapsedMs === undefined
          ? {}
          : { elapsedMs: response.elapsedMs }),
        kind: parsed.kind,
      });
    },
  );
}
