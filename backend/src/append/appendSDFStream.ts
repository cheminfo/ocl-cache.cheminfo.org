import { Molecule } from 'openchemlib';
import pino from 'pino';
import { MolfileStream } from 'sdf-parser';

import type { DB } from '../db/DB.ts';

import { appendStream } from './appendStream.ts';

const logger = pino({ messageKey: 'appendSDFStream' });
export async function appendSDFStream(stream: ReadableStream, db: DB) {
  logger.info('Appending SDF stream');

  const textDecoderStream = new TextDecoderStream();

  await appendStream(
    stream.pipeThrough(textDecoderStream).pipeThrough(new MolfileStream()),
    db,
    {
      getMolecule: (entry) => Molecule.fromMolfile(entry),
    },
  );
}
