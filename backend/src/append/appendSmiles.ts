import { Molecule } from 'openchemlib';
import pino from 'pino';

import calculateMoleculeInfoFromIDCodePromise from '../calculate/calculateMoleculeInfoFromIDCodePromise.ts';
import type { DB } from '../db/DB.ts';
import idCodeIsPresent from '../db/idCodeIsPresent.ts';
import { insertInfo } from '../db/insertInfo.ts';

const logger = pino({ messageKey: 'appendSmiles' });

export async function appendSmiles(text: string, db: DB) {
  const smilesArray = text.split(/\r?\n/);
  let existingMolecules = 0;
  let newMolecules = 0;
  let counter = 0;
  logger.info('Start append');
  for (const smiles of smilesArray) {
    counter++;
    if (counter % 1000 === 0) {
      logger.info(
        `Existing molecules: ${existingMolecules} - New molecules: ${newMolecules}`,
      );
    }

    try {
      const idCode = Molecule.fromSmiles(smiles).getIDCode();
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
      logger.error(`Error parsing molfile: ${error?.toString()}`);
      continue;
    }
    newMolecules++;
  }

  logger.info(`Existing molecules: ${existingMolecules}`);
  logger.info(`New molecules: ${newMolecules}`);

  logger.info('End append');
}
