import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import fastifyCors from '@fastify/cors';
import fastifySensible from '@fastify/sensible';
import fastifyStatic from '@fastify/static';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import type { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import type {
  FastifyReply,
  FastifyRequest,
  FastifyServerOptions,
} from 'fastify';
import createFastify from 'fastify';
import { robotsTxt } from 'react-cheminfo/core';

import { SITE } from './site.ts';
import type { FastifyTyped } from './types.ts';
import { injectTrackingScript } from './utils/injectTrackingScript.ts';
import { ROUTES, injectCrawlPath, injectPageMeta } from './utils/pageMeta.ts';
import { parseTrustProxy } from './utils/parseTrustProxy.ts';
import { buildSitemap } from './utils/sitemap.ts';
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
  /**
   * The built frontend to serve. Without it the server answers the API alone,
   * which is what a backend-only test wants.
   * @default the sibling frontend build when it exists
   */
  frontendRoot?: string;
  /** @default process.env.TRACKING_SCRIPT */
  trackingScript?: string;
  /**
   * Where the site is served from, written into every absolute address the
   * head carries. Without it the request's own host is used.
   * @default process.env.SITE_URL
   */
  siteUrl?: string;
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
    frontendRoot = defaultFrontendRoot(),
    trackingScript = process.env.TRACKING_SCRIPT,
    siteUrl = process.env.SITE_URL,
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
    uiConfig: { docExpansion: 'list', deepLinking: false },
  });

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

  if (frontendRoot === undefined) {
    // No page to serve, so the documentation is the only thing at the root.
    fastify.get('/', (_request, reply) => reply.redirect('/docs'));
  } else {
    registerFrontend(fastify, frontendRoot, { trackingScript, siteUrl });
  }
  // Links handed out before the move to /docs point here.
  fastify.get('/documentation', (_request, reply) => reply.redirect('/docs'));

  await fastify.ready();
  return fastify;
}

/**
 * Serve the built page at every address the frontend routes itself, with its
 * own head written per route.
 * @param fastify - the instance to register on
 * @param root - the directory holding the build
 * @param options - the tracking snippet and the address the site names itself
 * @param options.trackingScript - the analytics snippet, taken verbatim
 * @param options.siteUrl - where the site is served from
 */
function registerFrontend(
  fastify: FastifyTyped,
  root: string,
  options: { trackingScript?: string; siteUrl?: string },
): void {
  // The crawl path is the same on every address, so it is written once here
  // and the head is written per request below.
  const index = injectCrawlPath(
    injectTrackingScript(
      readFileSync(join(root, 'index.html'), 'utf8'),
      options.trackingScript,
    ),
  );

  const originOf = (request: FastifyRequest) =>
    options.siteUrl ?? `${request.protocol}://${request.host}`;

  const sendIndex = (request: FastifyRequest, reply: FastifyReply) =>
    reply
      .type('text/html; charset=utf-8')
      .send(
        injectPageMeta(index, { url: request.url, origin: originOf(request) }),
      );

  // `index: false` so the raw built page, which carries neither head nor crawl
  // path, is never served in place of the written one.
  void fastify.register(fastifyStatic, { root, index: false });

  fastify.get('/', { schema: { hide: true } }, sendIndex);
  fastify.get('/index.html', { schema: { hide: true } }, sendIndex);

  fastify.get('/sitemap.xml', { schema: { hide: true } }, (request, reply) =>
    reply
      .type('application/xml; charset=utf-8')
      .send(buildSitemap(originOf(request))),
  );

  fastify.get('/robots.txt', { schema: { hide: true } }, (request, reply) =>
    reply
      .type('text/plain; charset=utf-8')
      .send(
        robotsTxt({ site: SITE, routes: ROUTES, origin: originOf(request) }, [
          '/v1/',
          '/docs',
        ]),
      ),
  );

  fastify.setNotFoundHandler((request, reply) => {
    if (request.method !== 'GET' || request.url.startsWith('/v1/')) {
      return reply.code(404).send({ error: 'Not found' });
    }
    return sendIndex(request, reply);
  });
}

/**
 * The sibling frontend build, when one has been made.
 * @returns the directory, or undefined when there is no build to serve
 */
function defaultFrontendRoot(): string | undefined {
  const root = join(import.meta.dirname, '../../frontend/dist');
  try {
    readFileSync(join(root, 'index.html'));
    return root;
  } catch {
    return undefined;
  }
}
