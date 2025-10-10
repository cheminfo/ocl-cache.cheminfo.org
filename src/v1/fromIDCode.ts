import type { FastifyInstance } from 'fastify';

import { getInfoFromIDCode } from '../db/getInfoFromIDCode.ts';

export default function fromIDCode(fastify: FastifyInstance) {
  fastify.get<{ Querystring: { idCode: string } }>(
    '/v1/fromIDCode',
    {
      schema: {
        summary: 'Retrieve information from idCode',
        description: '',
        querystring: {
          type: 'object',
          properties: {
            idCode: {
              type: 'string',
              description: 'idCode',
            },
          },
          required: ['idCode'],
        },
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
