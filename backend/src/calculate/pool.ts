import { EventEmitter, once } from 'node:events';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

import { Piscina } from 'piscina';

import { workerThreadCount } from '../utils/workerThreadCount.ts';

// One waiter per in-flight request can be listening for 'drain' at once.
EventEmitter.defaultMaxListeners = 512;

/** How many worker threads the pool runs. */
export const POOL_THREADS = workerThreadCount();

/**
 * The queue depth a caller must wait below before adding to it. Twice the
 * thread count keeps every thread fed without letting the queue grow into a
 * list of tasks whose callers have long since given up.
 */
const MAX_QUEUE = POOL_THREADS * 2;

/**
 * How long a waiter sleeps before looking at the queue again when no 'drain'
 * arrives. The event alone is not enough: it fires only when a task finishes,
 * so a waiter that starts just after the last one would never be woken.
 */
const DRAIN_POLL_MS = 5;

/**
 * The one pool every CPU-bound step runs on: reading a query into a molecule,
 * and computing a molecule's properties. Both are openchemlib work measured in
 * hundreds of microseconds, which is far too long to spend on the event loop —
 * a single `Molecule.fromSmiles` costs about 24 times an indexed read of the
 * row it is looking for.
 */
export const pool = new Piscina({
  filename: join(import.meta.dirname, 'calculateMoleculeInfoFromIDCode.ts'),
  minThreads: POOL_THREADS,
  maxThreads: POOL_THREADS,
  idleTimeout: 1000,
});

/**
 * Wait until the pool's queue is short enough to take more work, so a burst of
 * requests queues in the server's accept backlog rather than in a list of
 * tasks the pool will still be chewing through long after the clients have
 * timed out.
 */
export async function waitForCapacity(): Promise<void> {
  while (pool.queueSize > MAX_QUEUE) {
    await Promise.race([once(pool, 'drain'), delay(DRAIN_POLL_MS)]);
  }
}
