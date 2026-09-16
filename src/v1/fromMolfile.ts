import { Type } from '@sinclair/typebox';

import { getDB } from '../db/dbFactory.ts';
import { getInfoFromMolfile } from '../db/getInfoFromMolfile.ts';
import type { FastifyTyped } from '../types.ts';

export default function fromMolfile(fastify: FastifyTyped) {
  fastify.get(
    '/fromMolfile',
    {
      schema: {
        tags: ['molecule'],
        summary: 'Retrieve information from a molfile',
        querystring: Type.Object({
          molfile: Type.String({ description: 'Molfile' }),
        }),
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
