import { setTimeout as delay } from 'node:timers/promises';

import pino from 'pino';

import { getDB } from '../db/dbFactory.ts';
import { indexMolecules } from '../search/indexMolecules.ts';
import { getSearchIndex } from '../search/searchIndex.ts';

const logger = pino({ name: 'indexMolecules' });

/** Molecules one window indexes before the service pauses. */
const WINDOW = Number(process.env.INDEX_LIMIT ?? 500_000);

/** How long to pause between two windows that still had work to do. */
const INTERVAL = Number(process.env.INDEX_INTERVAL ?? 10_000);

/** How long to wait before looking again once everything is indexed. */
const IDLE_INTERVAL = Number(process.env.INDEX_IDLE_INTERVAL ?? 60_000);

/** Hash every indexed molecule once the fingerprints are in. */
const HASHES = process.env.INDEX_HASHES !== 'false';

const db = await getDB();
const index = getSearchIndex();

const abortController = new AbortController();
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    logger.info('stopping at the end of this chunk');
    abortController.abort();
  });
}

logger.info(`indexing up to ${WINDOW} molecules per window`);

let idle = false;
while (!abortController.signal.aborted) {
  let worked = false;
  try {
    const pass = await indexMolecules(db, index, {
      limit: WINDOW,
      signal: abortController.signal,
    });
    worked = pass.indexed > 0;
    if (worked) {
      const perSecond = Math.round(pass.indexed / (pass.elapsedMs / 1000));
      logger.info(
        `${pass.indexed} molecules indexed in ${pass.elapsedMs} ms, ${perSecond}/s`,
      );
    }

    // The fingerprints are what a substructure search needs, so they go first
    // and completely; the hashes only answer the identity modes and are two
    // orders of magnitude dearer per molecule.
    if (HASHES && !pass.more && !abortController.signal.aborted) {
      const hashed = await index.molDB.backfillHashes({
        signal: abortController.signal,
        onProgress: ({ kind, hashed: done, remaining }) => {
          if (done % 100_000 !== 0) return;
          logger.info(`${kind}: ${done} hashed, ${remaining} left`);
        },
      });
      if (hashed.hashed > 0) {
        worked = true;
        for (const pass2 of hashed.passes) {
          logger.info(
            `${pass2.kind}: ${pass2.hashed} hashed, ${pass2.noHash} none, ${pass2.timedOut} capped, ${pass2.remaining} left`,
          );
        }
      }
    }
  } catch (error: unknown) {
    logger.error(error, 'the window failed; retrying after the interval');
  }

  if (!worked && !idle) logger.info('everything is indexed; watching for more');
  idle = !worked;
  await delay(worked ? INTERVAL : IDLE_INTERVAL);
}
