import { Type } from '@sinclair/typebox';

import { getDB } from '../db/dbFactory.ts';
import { lookupQuery } from '../db/lookupQuery.ts';
import type { FastifyTyped } from '../types.ts';

import { LookupResponseSchema } from './schemas.ts';

export default function fromIDCode(fastify: FastifyTyped) {
  fastify.get(
    '/fromIDCode',
    {
      schema: {
        tags: ['molecule'],
        summary: 'Retrieve information from idCode',
        querystring: Type.Object({
          idCode: Type.String({ description: 'idCode' }),
        }),
        response: { 200: LookupResponseSchema },
      },
    },
    async (request, response) => {
      const db = await getDB();
      try {
        const { result, cached } = await lookupQuery(request.query.idCode, db, {
          kind: 'idCode',
        });
        return await response.send({ result: result ?? {}, cached });
      } catch (error: unknown) {
        request.log.error(error);
        return response.send({ result: {}, log: error?.toString() });
      }
    },
  );
}
