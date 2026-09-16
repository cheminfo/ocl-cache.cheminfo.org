import { serialize } from 'bson';
import pino from 'pino';

import type {
  DBMoleculeInfo,
  MoleculeInfo,
  SSIndexColumns,
} from '../MoleculeInfo.ts';

import type { DB } from './DB.ts';

const logger = pino({ messageKey: 'insertInfo' });

export function insertInfo(info: MoleculeInfo, db: DB) {
  // 2 issues when we want to store the info in the database
  // 1. Atoms is an object and we need to convert it to a string
  // 2. Need to store the ssIndex as a blob

  // in the DB we prefer to store int64 in order to make substructure preindex search in the future
  const ssIndex = Int32Array.from(info.ssIndex);
  const ssIndex64 = new BigInt64Array(ssIndex.buffer);

  const ssIndexes = {} as SSIndexColumns;
  for (let i = 0; i < 8; i++) {
    ssIndexes[`ssIndex${i}` as keyof SSIndexColumns] = ssIndex64[i] ?? 0n;
  }

  const stmtData: DBMoleculeInfo = {
    ...info,
    // node:sqlite refuses to bind undefined
    unsaturation: info.unsaturation ?? null,
    ssIndex: new Uint8Array(ssIndex.buffer),
    atoms: serialize(info.atoms),
    ...ssIndexes,
  };

  try {
    db.insertInfo.run(stmtData);
  } catch (error: unknown) {
    logger.error(error, info.idCode);
  }
}
