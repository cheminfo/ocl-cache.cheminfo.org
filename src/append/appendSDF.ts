import { Molecule } from 'openchemlib';
import pino from 'pino';
import { parse } from 'sdf-parser';

import calculateMoleculeInfoFromIDCodePromise from '../calculate/calculateMoleculeInfoFromIDCodePromise.ts';
import type { DB } from '../db/DB.ts';
import idCodeIsPresent from '../db/idCodeIsPresent.ts';
import { insertInfo } from '../db/insertInfo.ts';

const logger = pino({ messageKey: 'appendSDF' });

export async function appendSDF(text: string, db: DB) {
  let existingMolecules = 0;
  let newMolecules = 0;
  let counter = 0;
  const entries = parse(text).molecules;

  logger.info('Start append');
  for (const entry of entries) {
    counter++;
    if (counter % 1000 === 0) {
      logger.info(
        `Existing molecules: ${existingMolecules} - New molecules: ${newMolecules}`,
      );
    }

    try {
      const idCode = Molecule.fromMolfile(entry.molfile).getIDCode();
      if (idCodeIsPresent(idCode, db)) {
        existingMolecules++;
        continue;
      }
      const { promise } = await calculateMoleculeInfoFromIDCodePromise(idCode);
      await promise
        .then((info) => {
          insertInfo(info, db);
        })
        .catch((error: unknown) => {
          logger.error(error);
        });
    } catch (error: unknown) {
      logger.error(error, `Error parsing molfile: ${entry.molfile}`);
      continue;
    }
    newMolecules++;
  }
  logger.info(`Existing molecules: ${existingMolecules}`);
  logger.info(`New molecules: ${newMolecules}`);

  logger.info('End append');
}
