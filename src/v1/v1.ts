import type { FastifyInstance } from 'fastify';

import fromIDCode from './fromIDCode.ts';
import fromMolfile from './fromMolfile.ts';
import fromSmiles from './fromSmiles.ts';

export default function v1(fastify: FastifyInstance) {
  fromSmiles(fastify);
  fromMolfile(fastify);
  fromIDCode(fastify);
}
