import { DatabaseSync } from 'node:sqlite';
import { parentPort, workerData } from 'node:worker_threads';

import pino from 'pino';

import { DB } from './DB.ts';
import {
  applyConnectionPragmas,
  slowQueryLogPath,
  watchWalSize,
} from './connection.ts';
import { insertInfoBatch } from './insertInfoBatch.ts';
import type { WriterRequest, WriterResponse } from './writerProtocol.ts';

const logger = pino({ messageKey: 'writerWorker' });

const port = parentPort;
if (port === null) {
  throw new Error('the writer only runs as a worker thread');
}

const { databasePath } = workerData as { databasePath: string };

// Its own connection, and the only one in this process that writes. Waiting
// out another process's write lock blocks whichever thread asked for it, so
// the thread that waits must not be the one answering requests. The schema is
// already migrated by the time this thread starts.
const connection = new DatabaseSync(databasePath);
applyConnectionPragmas(connection);
const db = new DB(connection, slowQueryLogPath(databasePath));

// Checkpointing is a write too, and belongs on the thread that already blocks.
watchWalSize(connection, databasePath);

port.on('message', (request: WriterRequest) => {
  switch (request.type) {
    case 'write': {
      let count = 0;
      try {
        count = insertInfoBatch(request.writes, db);
      } catch (error: unknown) {
        logger.error(error, 'the batch was rolled back');
      }
      reply({ type: 'written', count });
      break;
    }
    // Messages are handled in the order they were posted, so every write sent
    // before this one has already been committed.
    case 'flush':
      reply({ type: 'flushed', id: request.id });
      break;
    // no default
  }
});

/**
 * Answer the thread that sent the request.
 * @param response - what to send back
 */
function reply(response: WriterResponse): void {
  port?.postMessage(response);
}
