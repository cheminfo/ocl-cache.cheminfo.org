import { getDB } from '../db/dbFactory.ts';
import type { QueryLookupResult } from '../db/lookupQuery.ts';
import { lookupQueries } from '../db/lookupQuery.ts';
import type { FastifyTyped } from '../types.ts';

import { BatchRequestSchema, BatchResponseSchema } from './schemas.ts';

/**
 * Look many structures up in one request.
 *
 * A client holding a library of a hundred thousand structures would otherwise
 * pay a round trip for each one, which costs far more than the lookups do.
 * @param fastify - the instance the route is registered on
 */
export default function batch(fastify: FastifyTyped) {
  fastify.post(
    '/batch',
    {
      schema: {
        tags: ['molecule'],
        summary: 'Look many molecules up in one request',
        description:
          'Each query is read on its own, so one that is not a molecule reports its error and leaves the rest of the batch alone.',
        body: BatchRequestSchema,
        response: { 200: BatchResponseSchema },
      },
    },
    async (request, reply) => {
      const { queries, kind, cacheOnly } = request.body;

      const db = await getDB();
      const results = await lookupQueries(queries, db, { kind, cacheOnly });

      return reply.send({ results, summary: summarize(results) });
    },
  );
}

/**
 * Count how the batch went.
 * @param results - the answers, in the order they were asked for
 * @returns the totals the response carries
 */
function summarize(results: QueryLookupResult[]) {
  let cached = 0;
  let computed = 0;
  let failed = 0;

  for (const entry of results) {
    if (entry.error !== undefined) failed++;
    else if (entry.cached) cached++;
    else if (entry.result !== null) computed++;
  }

  return { total: results.length, cached, computed, failed };
}
