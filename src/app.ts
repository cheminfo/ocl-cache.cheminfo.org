import fastifyCors from '@fastify/cors';
import fastifySensible from '@fastify/sensible';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import type { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import type { FastifyServerOptions } from 'fastify';
import createFastify from 'fastify';

import type { FastifyTyped } from './types.ts';
import { parseTrustProxy } from './utils/parseTrustProxy.ts';
import v1 from './v1/v1.ts';

const devLogger = {
  level: 'info',
  transport: {
    // https://fastify.dev/docs/latest/Reference/Logging/
    target: 'pino-pretty',
    options: {
      translateTime: 'SYS:HH:MM:ss',
      ignore: 'pid,hostname',
    },
  },
};

export interface BuildAppOptions {
  /** @default parsed from TRUST_PROXY, else false */
  trustProxy?: boolean | number | string;
  /** @default pino-pretty in development, true in production */
  logger?: FastifyServerOptions['logger'];
}

/**
 * Build the Fastify instance, with every route registered.
 * @param options - overrides, used by the tests
 * @returns the ready-to-listen instance
 */
export async function buildApp(
  options: BuildAppOptions = {},
): Promise<FastifyTyped> {
  const {
    trustProxy = parseTrustProxy(process.env.TRUST_PROXY),
    logger = process.env.NODE_ENV === 'production' ? true : devLogger,
  } = options;

  const serverOptions: FastifyServerOptions = {
    logger,
    // Fastify accepts a hop count at run time; its types omit `number`.
    trustProxy: trustProxy as FastifyServerOptions['trustProxy'],
  };

  const fastify =
    createFastify(serverOptions).withTypeProvider<TypeBoxTypeProvider>();

  await fastify.register(fastifyCors, { maxAge: 86400 });
  await fastify.register(fastifySensible);

  await fastify.register(fastifySwagger, {
    openapi: {
      info: {
        title: 'Cache openchemlib calculation results',
        description:
          'Derived molecule properties (idCode, logP, tautomers, …), cached in SQLite.',
        version: '1.0.0',
      },
    },
  });

  await fastify.register(fastifySwaggerUi, {
    routePrefix: '/docs',
    uiConfig: { docExpansion: 'full', deepLinking: false },
  });

  fastify.get('/', (_request, reply) => reply.redirect('/docs'));
  // Links handed out before the move to /docs point here.
  fastify.get('/documentation', (_request, reply) => reply.redirect('/docs'));

  fastify.get(
    '/health',
    { schema: { tags: ['system'], summary: 'Liveness probe' } },
    (request) => {
      request.log.debug({ clientIp: request.ip }, 'health');
      return { status: 'ok' };
    },
  );

  await fastify.register(
    (instance, _opts, done) => {
      v1(instance);
      done();
    },
    { prefix: '/v1' },
  );

  await fastify.ready();
  return fastify;
}
