import type { FastifyInstance } from 'fastify';

import getDB from '../db/getDB.ts';
import { getInfoFromSmiles } from '../db/getInfoFromSmiles.ts';

export default function fromSmiles(fastify: FastifyInstance) {
  fastify.get<{ Querystring: { smiles: string } }>(
    '/v1/fromSmiles',
    {
      schema: {
        summary: 'Retrieve information from a SMILES',
        description: '',
        querystring: {
          type: 'object',
          properties: {
            smiles: {
              type: 'string',
              description: 'SMILES',
            },
          },
          required: ['smiles'],
        },
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
