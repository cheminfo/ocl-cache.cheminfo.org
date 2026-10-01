import { buildApp } from './app.ts';
import { getDB } from './db/dbFactory.ts';
import { startWriteQueue, stopWriteQueue } from './db/writeQueue.ts';

const PORT = Number(process.env.PORT ?? 20822);

const fastify = await buildApp();

// The schema must be migrated before the writer thread opens its own
// connection, and the writer must exist before the first request can miss.
await getDB();
startWriteQueue();

fastify.listen({ port: PORT, host: '0.0.0.0' }, (error: unknown) => {
  if (error) {
    fastify.log.error(error);
    process.exitCode = 1;
    return;
  }
  fastify.log.info(`Listening on http://0.0.0.0:${PORT}/`);
});

for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.once(signal, () => {
    void shutdown(signal);
  });
}

/**
 * Stop answering, then write whatever the queue is still holding.
 * @param signal - what asked the process to stop
 */
async function shutdown(signal: string): Promise<void> {
  fastify.log.info(`${signal}: draining`);
  try {
    await fastify.close();
    await stopWriteQueue();
  } catch (error: unknown) {
    fastify.log.error(error);
    process.exitCode = 1;
  }
}
