import { Type } from '@sinclair/typebox';

import { getInfoFromIDCode } from '../db/getInfoFromIDCode.ts';
import type { FastifyTyped } from '../types.ts';

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
      },
    },
    async (request, response) => {
      try {
        const result = await getInfoFromIDCode(request.query.idCode);
        return await response.send({ result });
      } catch (error: unknown) {
        request.log.error(error);
        return response.send({ result: {}, log: error?.toString() });
      }
    },
  );
}
