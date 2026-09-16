import { openAsBlob } from 'node:fs';
import { join } from 'node:path';

import { expect, test } from 'vitest';

import { getTempDB } from '../../db/dbFactory.ts';
import { appendSDFStream } from '../appendSDFStream.ts';

test('appendSDFStream', { timeout: 30000 }, async () => {
  const file = await openAsBlob(join(import.meta.dirname, 'diol.sdf'));

  const db = await getTempDB();
  await appendSDFStream(file.stream(), db);

  const result = db.selectAllIDCode.all();

  expect(result).toStrictEqual([
    { idCode: 'gCaHD@aIj`@' },
    { idCode: 'gJQDD@`pBSMT@qB`@' },
    { idCode: 'gJQDL@aPBTuT@qD`@' },
  ]);
});

test('appendSDFStream compressed file', async () => {
  const file = await openAsBlob(join(import.meta.dirname, 'diol.sdf.gz'));
  const decompressionStream = new DecompressionStream('gzip');
  const stream = file.stream().pipeThrough(decompressionStream);

  const db = await getTempDB();
  await appendSDFStream(stream, db);

  const result = db.selectAllIDCode.all();

  expect(result).toStrictEqual([
    { idCode: 'gCaHD@aIj`@' },
    { idCode: 'gJQDD@`pBSMT@qB`@' },
    { idCode: 'gJQDL@aPBTuT@qD`@' },
  ]);

  const result2 = db.searchIDCode.get('gJQDD@`pBSMT@qB`@');

  expect(result2).toMatchObject({
    idCode: 'gJQDD@`pBSMT@qB`@',
    mf: 'C2H5[2H]OS',
    em: 79.02021273324,
    mw: 79.13946967231473,
    charge: 0,
    noStereoID: 'gJQDD@`pBSMT@qB`@',
    noStereoTautomerID: 'gJQDD@`pBSMT@qB`@',
    failedTautomerID: 0,
    logS: -1.2719999626278877,
    logP: 0.04909995198249817,
    acceptorCount: 1,
    donorCount: 1,
    rotatableBondCount: 1,
    stereoCenterCount: 1,
    polarSurfaceArea: 59.029998779296875,
    nbFragments: 1,
    unsaturation: 0,
  });
});
