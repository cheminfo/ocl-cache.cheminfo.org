import type { FastifyTyped } from '../types.ts';

import fromIDCode from './fromIDCode.ts';
import fromMolfile from './fromMolfile.ts';
import fromSmiles from './fromSmiles.ts';
import lookup from './lookup.ts';
import stats from './stats.ts';

/**
 * Register every versioned route.
 * @param fastify - the instance the routes are registered on
 */
export default function v1(fastify: FastifyTyped) {
  fromSmiles(fastify);
  fromMolfile(fastify);
  fromIDCode(fastify);
  lookup(fastify);
  stats(fastify);
}
