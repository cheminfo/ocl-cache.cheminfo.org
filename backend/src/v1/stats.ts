import { Type } from '@sinclair/typebox';

import { getDB } from '../db/dbFactory.ts';
import { liveTotal, readStats } from '../stats/statsStore.ts';
import type { FastifyTyped } from '../types.ts';

/**
 * The figures the statistics page draws.
 *
 * Everything but `total` comes from the rollup a background pass writes, so
 * this route is one read however large the cache has grown. `total` is the
 * live number, which costs nothing because no row is ever deleted and the last
 * rowid is therefore the count.
 * @param fastify - the instance the route is registered on
 */
export default function stats(fastify: FastifyTyped) {
  fastify.get(
    '/stats',
    {
      schema: {
        tags: ['statistics'],
        summary: 'Figures describing everything the cache holds',
        description:
          'The rollup is refreshed on a schedule, so `computedAt` says how old the figures are. `total` is always current.',
        response: {
          200: Type.Object({
            total: Type.Number({
              description: 'Molecules cached right now',
            }),
            snapshot: Type.Union(
              [
                Type.Object({
                  computedAt: Type.Number(),
                  durationMs: Type.Number(),
                  scanned: Type.Number(),
                  stats: Type.Any(),
                }),
                Type.Null(),
              ],
              {
                description: 'The last rollup, or null when none has run yet',
              },
            ),
          }),
        },
      },
    },
    async (_request, reply) => {
      const db = await getDB();
      return reply.send({ total: liveTotal(db), snapshot: readStats(db) });
    },
  );
}
