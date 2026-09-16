import { Molecule } from 'openchemlib';
import pino from 'pino';

import type { DB } from '../db/DB.ts';
import { LineStream } from '../utils/LineStream.ts';

import { appendStream } from './appendStream.ts';

const logger = pino({ messageKey: 'appendSmilesStream' });
export async function appendSmilesStream(stream: ReadableStream, db: DB) {
  logger.info('Appending SMILES stream');

  const textDecoderStream = new TextDecoderStream();

  await appendStream(
    stream.pipeThrough(textDecoderStream).pipeThrough(new LineStream()),
    db,
    {
      getMolecule: (entry: string) => Molecule.fromSmiles(entry),
    },
  );
}
