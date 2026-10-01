import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { Worker } from 'node:worker_threads';

import pino from 'pino';

import type { MoleculeInfo } from '../MoleculeInfo.ts';

import { getDatabasePath, stopWalCheckpointing } from './dbFactory.ts';
import type { PendingWrite } from './insertInfoBatch.ts';
import { WRITE_BATCH_SIZE } from './insertInfoBatch.ts';
import type { WriterRequest, WriterResponse } from './writerProtocol.ts';

const logger = pino({ messageKey: 'writeQueue' });

/**
 * How many molecules may wait to be written before new ones are let go.
 *
 * Dropping one costs nothing but the work to compute it again: this is a
 * cache, and a row that never arrives is a miss, not a lost record.
 */
const MAX_PENDING = 10_000;

/** How many batches may be with the writer at once. */
const MAX_IN_FLIGHT = 2;

/** How long a part-filled batch waits for company before being sent anyway. */
const PARTIAL_FLUSH_MS = 250;

/**
 * How long a shutdown waits for the writer to commit what is left. The
 * container allows thirty seconds to stop; a writer still blocked after ten is
 * one waiting on somebody else's lock, and the rows are only cache.
 */
const DRAIN_TIMEOUT = 10_000;

/** What became of a row handed to the queue. */
export type WriteOutcome = 'queued' | 'dropped' | 'disabled';

let worker: Worker | undefined;
let pending: PendingWrite[] = [];
const queuedIdCodes = new Set<string>();
const inFlightIdCodes: string[][] = [];
let partialTimer: NodeJS.Timeout | undefined;
let flushSequence = 0;
const flushWaiters = new Map<number, () => void>();
let droppedCount = 0;

/**
 * Start the thread that owns every write this process makes.
 *
 * `node:sqlite` is synchronous and SQLite takes one writer at a time, so an
 * insert that meets the importer's write lock blocks the thread that issued
 * it — measured at half a second typically and nearly six at worst, during
 * which an event loop answers nothing at all. Writes therefore leave the
 * request path here: the caller hands over a row and is done with it.
 * @param databasePath - the file to write to
 */
export function startWriteQueue(
  databasePath: string = getDatabasePath(),
): void {
  if (worker !== undefined) return;

  worker = new Worker(join(import.meta.dirname, 'writerWorker.ts'), {
    workerData: { databasePath },
  });
  worker.on('message', onWriterMessage);
  worker.on('error', (error) => {
    logger.error(error, 'the writer thread failed');
  });

  // The writer owns checkpointing now; it must not also run here.
  stopWalCheckpointing();
}

/**
 * Hand a computed molecule to the writer.
 * @param info - the computed properties
 * @param createdAt - the insertion time to record, in unix seconds
 * @returns whether the queue took it, let it go, or is not running
 */
export function enqueueInfo(
  info: MoleculeInfo,
  createdAt: number,
): WriteOutcome {
  if (worker === undefined) return 'disabled';
  // Two requests for the same uncached molecule both compute it; only the
  // first needs to be written.
  if (queuedIdCodes.has(info.idCode)) return 'queued';
  if (pending.length >= MAX_PENDING) {
    droppedCount++;
    return 'dropped';
  }

  pending.push({ info, createdAt });
  queuedIdCodes.add(info.idCode);
  sendWhatIsReady();
  return 'queued';
}

/** What the queue is holding, for tests and for a readiness view. */
export function writeQueueStats() {
  return {
    running: worker !== undefined,
    pending: pending.length,
    inFlight: inFlightIdCodes.length,
    dropped: droppedCount,
  };
}

/**
 * Write everything still waiting, then stop the thread.
 */
export async function stopWriteQueue(): Promise<void> {
  const running = worker;
  if (running === undefined) return;

  // Claimed before the first await, so nothing enqueued from here on is
  // accepted into a queue that is being drained.
  worker = undefined;
  clearTimeout(partialTimer);
  partialTimer = undefined;
  while (pending.length > 0) postBatchTo(running);

  const id = ++flushSequence;
  const drained = new Promise<void>((resolve) => {
    flushWaiters.set(id, resolve);
    running.postMessage({ type: 'flush', id } satisfies WriterRequest);
  });
  // Unreferenced: the writer thread itself keeps the loop alive until it is
  // terminated below, so this timer must not hold the process open after the
  // acknowledgement has already arrived.
  await Promise.race([
    drained,
    delay(DRAIN_TIMEOUT, undefined, { ref: false }),
  ]);
  flushWaiters.delete(id);

  queuedIdCodes.clear();
  inFlightIdCodes.length = 0;
  await running.terminate();
}

/**
 * Reset the queue without flushing, for tests.
 */
export const _resetWriteQueue = (): void => {
  clearTimeout(partialTimer);
  partialTimer = undefined;
  worker = undefined;
  pending = [];
  queuedIdCodes.clear();
  inFlightIdCodes.length = 0;
  flushWaiters.clear();
  droppedCount = 0;
};

/**
 * Handle what the writer sends back.
 * @param response - the writer's message
 */
function onWriterMessage(response: WriterResponse): void {
  if (response.type === 'written') {
    for (const idCode of inFlightIdCodes.shift() ?? []) {
      queuedIdCodes.delete(idCode);
    }
    sendWhatIsReady();
    return;
  }
  flushWaiters.get(response.id)?.();
  flushWaiters.delete(response.id);
}

/**
 * Send every full batch the writer has room for, and arrange for a part-filled
 * one to follow if nothing else arrives.
 */
function sendWhatIsReady(): void {
  while (
    inFlightIdCodes.length < MAX_IN_FLIGHT &&
    pending.length >= WRITE_BATCH_SIZE
  ) {
    postBatch();
  }

  if (pending.length > 0 && partialTimer === undefined) {
    partialTimer = setTimeout(() => {
      partialTimer = undefined;
      if (pending.length > 0) postBatch();
      sendWhatIsReady();
    }, PARTIAL_FLUSH_MS);
    partialTimer.unref();
  }
}

/** Post the next batch of rows to the running writer, if there is one. */
function postBatch(): void {
  if (worker !== undefined) postBatchTo(worker);
}

/**
 * Post the next batch of rows to a given writer.
 * @param running - the writer thread
 */
function postBatchTo(running: Worker): void {
  const writes = pending.splice(0, WRITE_BATCH_SIZE);
  inFlightIdCodes.push(writes.map(({ info }) => info.idCode));
  running.postMessage({ type: 'write', writes } satisfies WriterRequest);
}
