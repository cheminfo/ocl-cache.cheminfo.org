import { join } from 'node:path';

import pino from 'pino';

import { getDB, getDataDir } from '../db/dbFactory.ts';
import { refreshStats } from '../stats/statsStore.ts';

const logger = pino({ name: 'refreshStats' });

/**
 * How long to wait between two passes, in milliseconds.
 *
 * A pass normally reads only the molecules that arrived since the last one, so
 * this can be short: fifteen minutes over fifty thousand new molecules took
 * 0.18 s where a pass over two million took 12.5 s.
 */
const INTERVAL = Number(process.env.STATS_INTERVAL ?? 15 * 60 * 1000);

const db = await getDB();

// The two COUNT(DISTINCT) queries of a full pass sort every id in the table.
// Held in memory that costs ~21 bytes per distinct value — over four gigabytes
// at two hundred million, which is more than the container is given. Spilled to
// a file it costs ~3 bytes, and measured, it is also faster. The directory has
// to be on the data volume: the root filesystem is read-only and /tmp is a
// tmpfs, so spilling there would be memory again.
process.env.SQLITE_TMPDIR ??= join(getDataDir(), 'tmp');
db.exec('PRAGMA temp_store = FILE');

/**
 * Run one pass and log what it found.
 *
 * The pass runs in this process rather than in the server's, because a full
 * one walks the whole table and has no business inside a request.
 */
async function pass(): Promise<void> {
  try {
    const snapshot = await refreshStats(db, {
      onProgress: (scanned) => {
        if (scanned % 1_000_000 === 0) logger.info(`read ${scanned} molecules`);
      },
    });
    logger.info(
      `${snapshot.full ? 'full' : 'incremental'} pass: ${snapshot.scanned} ` +
        `molecules read in ${snapshot.durationMs} ms, ` +
        `${snapshot.stats.total} cached in total`,
    );
  } catch (error: unknown) {
    logger.error(error);
  }
}

await pass();
setInterval(() => void pass(), INTERVAL);
