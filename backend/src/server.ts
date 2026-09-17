import { buildApp } from './app.ts';

const PORT = Number(process.env.PORT ?? 20822);

const fastify = await buildApp();

fastify.listen({ port: PORT, host: '0.0.0.0' }, (error: unknown) => {
  if (error) {
    fastify.log.error(error);
    process.exitCode = 1;
    return;
  }
  fastify.log.info(`Listening on http://0.0.0.0:${PORT}/`);
});
