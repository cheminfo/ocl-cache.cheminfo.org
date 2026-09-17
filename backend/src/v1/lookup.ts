import { Type } from '@sinclair/typebox';

import { getDB } from '../db/dbFactory.ts';
import { getInfoFromMolecule } from '../db/getInfoFromMolecule.ts';
import { parseQuery } from '../search/parseQuery.ts';
import type { FastifyTyped } from '../types.ts';

import { CacheLookupResponseSchema, QueryKindSchema } from './schemas.ts';

/**
 * One lookup for any of the three notations, which is what the page's search
 * box needs: it does not know whether what was typed is a SMILES, a molfile or
 * an idCode.
 * @param fastify - the instance the route is registered on
 */
export default function lookup(fastify: FastifyTyped) {
  fastify.get(
    '/lookup',
    {
      schema: {
        tags: ['molecule'],
        summary: 'Look a molecule up, however its structure is written',
        querystring: Type.Object({
          q: Type.String({ description: 'SMILES, molfile or idCode' }),
          kind: QueryKindSchema,
          cacheOnly: Type.Optional(
            Type.Boolean({
              description:
                'Return nothing on a miss instead of computing and storing it',
            }),
          ),
        }),
        response: { 200: CacheLookupResponseSchema },
      },
    },
    async (request, reply) => {
      const { q, kind, cacheOnly } = request.query;
      let parsed;
      try {
        parsed = parseQuery(q, kind);
      } catch {
        return reply.badRequest('that is not a molecule in any notation');
      }

      const db = await getDB();
      const { info, cached } = await getInfoFromMolecule(parsed.molecule, db, {
        cacheOnly,
      });
      return reply.send({ result: info, cached, kind: parsed.kind });
    },
  );
}
