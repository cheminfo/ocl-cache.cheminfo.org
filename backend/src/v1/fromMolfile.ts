import { Type } from '@sinclair/typebox';

import { getDB } from '../db/dbFactory.ts';
import { lookupQuery } from '../db/lookupQuery.ts';
import type { FastifyTyped } from '../types.ts';

import { LookupResponseSchema } from './schemas.ts';

export default function fromMolfile(fastify: FastifyTyped) {
  fastify.get(
    '/fromMolfile',
    {
      schema: {
        tags: ['molecule'],
        summary: 'Retrieve information from a molfile',
        querystring: Type.Object({
          molfile: Type.String({ description: 'molfile' }),
        }),
        response: { 200: LookupResponseSchema },
      },
    },
    async (request, response) => {
      const db = await getDB();
      try {
        const { result, cached } = await lookupQuery(
          request.query.molfile,
          db,
          {
            kind: 'molfile',
          },
        );
        return await response.send({ result: result ?? {}, cached });
      } catch (error: unknown) {
        request.log.error(error);
        return response.send({ result: {}, log: error?.toString() });
      }
    },
  );
}
