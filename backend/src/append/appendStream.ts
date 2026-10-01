import type { Molecule } from 'openchemlib';
import pino from 'pino';

import calculateMoleculeInfoFromIDCodePromise from '../calculate/calculateMoleculeInfoFromIDCodePromise.ts';
import type { DB } from '../db/DB.ts';
import idCodeIsPresent from '../db/idCodeIsPresent.ts';
import type { PendingWrite } from '../db/insertInfoBatch.ts';
import { WRITE_BATCH_SIZE, insertInfoBatch } from '../db/insertInfoBatch.ts';
import { nowSeconds } from '../db/toDBMoleculeInfo.ts';

type GetMolecule = (entry: string) => Molecule;

const logger = pino({ messageKey: 'appendStream' });

interface AppendStramOptions {
  getMolecule: GetMolecule;
}

export async function appendStream(
  stream: ReadableStream,
  db: DB,
  options: AppendStramOptions,
) {
  let existingMolecules = 0;
  let newMolecules = 0;
  let counter = 0;
  const { getMolecule } = options;
  const activePromises = new Set<Promise<void>>();
  // Computed rows wait here until there are enough of them to be worth a
  // transaction. One insert per molecule takes and releases the write lock
  // every time, which is what made an import contend with everything else
  // touching the file.
  const batch: PendingWrite[] = [];

  logger.info('Start append');

  for await (const entry of stream) {
    counter++;
    if (counter % 1000 === 0) {
      logger.info(
        `Existing molecules: ${existingMolecules} - New molecules: ${newMolecules}`,
      );
    }
    try {
      const idCode = getMolecule(entry).getIDCode();
      if (idCodeIsPresent(idCode, db)) {
        existingMolecules++;
        continue;
      }
      const { promise } = await calculateMoleculeInfoFromIDCodePromise(idCode);
      const trackedPromise = promise
        .then((info) => {
          batch.push({ info, createdAt: nowSeconds() });
          if (batch.length >= WRITE_BATCH_SIZE) {
            insertInfoBatch(batch.splice(0), db);
          }
        })
        .catch((error: unknown) => {
          logger.error(error?.toString());
        })
        .finally(() => {
          activePromises.delete(trackedPromise);
        });

      activePromises.add(trackedPromise);
    } catch (error: unknown) {
      logger.info(`Error parsing smiles: ${error?.toString()}`);
      continue;
    }
    newMolecules++;
  }
  await Promise.all(activePromises);
  insertInfoBatch(batch.splice(0), db);
  logger.info(`Existing molecules: ${existingMolecules}`);
  logger.info(`New molecules: ${newMolecules}`);

  logger.info('End append');
}
