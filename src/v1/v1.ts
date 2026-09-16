import type { FastifyTyped } from '../types.ts';

import fromIDCode from './fromIDCode.ts';
import fromMolfile from './fromMolfile.ts';
import fromSmiles from './fromSmiles.ts';

export default function v1(fastify: FastifyTyped) {
  fromSmiles(fastify);
  fromMolfile(fastify);
  fromIDCode(fastify);
}
