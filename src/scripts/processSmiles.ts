import { mkdirSync, renameSync } from 'node:fs';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

import { FileCollection } from 'file-collection';
import pino from 'pino';

import { appendSmilesStream } from '../append/appendSmilesStream.ts';
import { getDB } from '../db/dbFactory.ts';

const logger = pino({ messageKey: 'processSmiles' });

const parentDir = join(import.meta.dirname, '../../data/smiles');
const baseDir = join(parentDir, 'to_process');

logger.info(`Checking for SMILES files in: ${baseDir}`);

const db = await getDB();

while (true) {
  const fileCollection = new FileCollection();
  await fileCollection.appendPath(baseDir);

  for (const file of fileCollection) {
    logger.info(`Importing: ${file.name}`);
    await appendSmilesStream(file.stream(), db);
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
  logger.trace('Waiting for new SMILES files');
  await delay(10000);
}
