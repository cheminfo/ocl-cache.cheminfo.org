import { mkdirSync, renameSync } from 'node:fs';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

import { FileCollection } from 'file-collection';
import pino from 'pino';

import { getDB } from '../db/dbFactory.ts';
import { appendSDFStream } from '../index.ts';

const parentDir = join(import.meta.dirname, '../../data/sdf');
const sdfDir = join(parentDir, 'to_process');
const logger = pino({ messageKey: 'processSDF' });

logger.info(`Checking for SDF files in: ${sdfDir}`);

const db = await getDB();

while (true) {
  const fileCollection = new FileCollection();
  await fileCollection.appendPath(sdfDir);
  for (const file of fileCollection) {
    logger.info(`Importing: ${file.name}`);
    await appendSDFStream(file.stream(), db);
    // in file-collection, content of compressed zip files are appended to the parent file with '/' and content
    // this code limits zip files to be processed to only one file
    const sourceFile = join(
      parentDir,
      file.parent?.relativePath || file.relativePath,
    );

    logger.info(`Moving: ${sourceFile}`);
    const targetFile = sourceFile.replace('to_process', 'processed');
    const targetFolder = targetFile.replace(/\/[^/]+$/, '');
    mkdirSync(targetFolder, { recursive: true });
    renameSync(sourceFile, sourceFile.replace('to_process', 'processed'));
    logger.info(`End importing: ${file.name}`);
  }
  logger.trace('Waiting for new SDF files');
  await delay(10000);
}
