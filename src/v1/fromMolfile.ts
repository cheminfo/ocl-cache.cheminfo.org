import type { FastifyInstance } from 'fastify';

import getDB from '../db/getDB.ts';
import { getInfoFromMolfile } from '../db/getInfoFromMolfile.ts';

export default function fromMolfile(fastify: FastifyInstance) {
  fastify.get<{ Querystring: { molfile: string } }>(
    '/v1/fromMolfile',
    {
      schema: {
        summary: 'Retrieve information from a molfile',
        description: '',
        querystring: {
          type: 'object',
          properties: {
            molfile: {
              type: 'string',
              description: 'Molfile',
            },
          },
          required: ['molfile'],
        },
      },
    },
    async (request, response) => {
      const db = await getDB();
      try {
        const result = await getInfoFromMolfile(request.query.molfile, db);
        return await response.send({ result });
      } catch (error: unknown) {
        request.log.error(error);
        return response.send({ result: {}, log: error?.toString() });
      }
    },
  );
}
