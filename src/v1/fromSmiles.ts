import { Type } from '@sinclair/typebox';

import { getDB } from '../db/dbFactory.ts';
import { getInfoFromSmiles } from '../db/getInfoFromSmiles.ts';
import type { FastifyTyped } from '../types.ts';

export default function fromSmiles(fastify: FastifyTyped) {
  fastify.get(
    '/fromSmiles',
    {
      schema: {
        tags: ['molecule'],
        summary: 'Retrieve information from a SMILES',
        querystring: Type.Object({
          smiles: Type.String({ description: 'SMILES' }),
        }),
      },
    },
    async (request, response) => {
      const db = await getDB();
      try {
        const result = await getInfoFromSmiles(request.query.smiles, db);
        return await response.send({ result });
      } catch (error: unknown) {
        request.log.error(error);
        return response.send({ result: {}, log: error?.toString() });
      }
    },
  );
}
