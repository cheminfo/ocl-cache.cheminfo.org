import pino from 'pino';

import { getDB } from '../db/dbFactory.ts';
import { refreshStats } from '../stats/statsStore.ts';

const logger = pino({ name: 'refreshStats' });

/** How long to wait between two passes, in milliseconds. */
const INTERVAL = Number(process.env.STATS_INTERVAL ?? 6 * 60 * 60 * 1000);

const db = await getDB();

/**
 * Run one pass and log what it found.
 *
 * The pass runs in this process rather than in the server's, because its two
 * `COUNT(DISTINCT)` queries take seconds on a large cache and have no business
 * inside a request.
 */
async function pass(): Promise<void> {
  try {
    const snapshot = await refreshStats(db, (scanned) => {
      if (scanned % 500_000 === 0) logger.info(`read ${scanned} molecules`);
    });
    logger.info(
      `${snapshot.scanned} molecules in ${snapshot.durationMs} ms, ` +
        `${snapshot.stats.perMonth.length} months recorded`,
    );
  } catch (error: unknown) {
    logger.error(error);
  }
}

await pass();
setInterval(() => void pass(), INTERVAL);
