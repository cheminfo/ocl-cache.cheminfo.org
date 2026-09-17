import { join } from 'node:path';

import { afterAll, beforeAll, expect, test } from 'vitest';

import { buildApp } from '../app.ts';
import type { FastifyTyped } from '../types.ts';

let app: FastifyTyped;

/**
 * A page carrying the two markers, so the head and the crawl path are written
 * into something the tests own rather than into whatever the last frontend
 * build left behind.
 */
const FIXTURE_ROOT = join(import.meta.dirname, 'fixture');

/**
 * Ask a freshly built app what client address it resolves, so the trustProxy
 * wiring is asserted on the value Fastify actually computes.
 */
async function resolveClientIp(
  trustProxy: boolean | number | string,
  remoteAddress: string,
  forwardedFor: string,
): Promise<string | undefined> {
  let clientIp: string | undefined;
  const instance = await buildApp({
    trustProxy,
    logger: {
      level: 'debug',
      stream: {
        write(line: string) {
          const entry = JSON.parse(line) as { clientIp?: string };
          clientIp ??= entry.clientIp;
        },
      },
    },
  });
  try {
    await instance.inject({
      method: 'GET',
      url: '/health',
      remoteAddress,
      headers: { 'x-forwarded-for': forwardedFor },
    });
  } finally {
    await instance.close();
  }
  return clientIp;
}

beforeAll(async () => {
  app = await buildApp({
    trustProxy: '192.168.1.5',
    logger: false,
    frontendRoot: FIXTURE_ROOT,
    siteUrl: 'https://ocl-cache.cheminfo.org',
  });
});

afterAll(async () => {
  await app.close();
});

test('health answers ok', async () => {
  const response = await app.inject({ method: 'GET', url: '/health' });

  expect(response.statusCode).toBe(200);
  expect(response.json()).toStrictEqual({ status: 'ok' });
});

test('the root serves the page, titled as the search', async () => {
  const response = await app.inject({ method: 'GET', url: '/' });

  expect(response.statusCode).toBe(200);
  expect(response.headers['content-type']).toBe('text/html; charset=utf-8');
  expect(response.body).toContain(
    '<title>Molecule property cache — look up a structure — ocl-cache</title>',
  );
  expect(response.body).toContain(
    '<link rel="canonical" href="https://ocl-cache.cheminfo.org/"',
  );
});

test('a blank SITE_URL falls back to the requested host', async () => {
  // `SITE_URL: ${SITE_URL:-}` in the compose files hands a deployment that
  // names no address an empty string, which is not absent: read as an origin
  // it threw, and every page answered 500.
  const instance = await buildApp({
    trustProxy: '192.168.1.5',
    logger: false,
    frontendRoot: FIXTURE_ROOT,
    siteUrl: '',
  });

  try {
    const response = await instance.inject({
      method: 'GET',
      url: '/',
      remoteAddress: '192.168.1.5',
      headers: {
        host: 'ocl-cache.cheminfo.org',
        'x-forwarded-proto': 'https',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain(
      '<link rel="canonical" href="https://ocl-cache.cheminfo.org/"',
    );
  } finally {
    await instance.close();
  }
});

test('the former documentation address still redirects', async () => {
  const response = await app.inject({ method: 'GET', url: '/documentation' });

  expect(response.statusCode).toBe(302);
  expect(response.headers.location).toBe('/docs');
});

test('the documentation is served at /docs', async () => {
  const response = await app.inject({ method: 'GET', url: '/docs/' });

  expect(response.statusCode).toBe(200);
});

test('every route is registered under /v1', async () => {
  const paths = Object.keys(
    (app.swagger() as { paths: Record<string, unknown> }).paths,
  );

  expect(paths).toContain('/v1/fromSmiles');
  expect(paths).toContain('/v1/fromMolfile');
  expect(paths).toContain('/v1/fromIDCode');
  expect(paths).toContain('/v1/lookup');
  expect(paths).toContain('/v1/stats');
  // The cache answers for one molecule at a time; it does not offer a search
  // that walks it.
  expect(paths).not.toContain('/v1/substructure');
});

test('a missing query parameter is rejected by the schema', async () => {
  const response = await app.inject({ method: 'GET', url: '/v1/fromSmiles' });

  expect(response.statusCode).toBe(400);
  expect(response.json().message).toBe(
    "querystring must have required property 'smiles'",
  );
});

test('a trusted proxy sets the client address', async () => {
  const clientIp = await resolveClientIp(
    '192.168.1.5',
    '192.168.1.5',
    '203.0.113.7',
  );

  expect(clientIp).toBe('203.0.113.7');
});

test('an untrusted peer cannot claim an address', async () => {
  const clientIp = await resolveClientIp(false, '203.0.113.9', '198.51.100.1');

  expect(clientIp).toBe('203.0.113.9');
});
