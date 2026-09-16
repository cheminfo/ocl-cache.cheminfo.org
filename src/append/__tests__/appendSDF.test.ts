import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { expect, test } from 'vitest';

import { getTempDB } from '../../db/dbFactory.ts';
import { appendSDF } from '../appendSDF.ts';

test('appendSDF', { timeout: 30000 }, async () => {
  const data = await readFile(join(import.meta.dirname, 'diol.sdf'), 'utf8');
  const db = await getTempDB();
  await appendSDF(data, db);

  const result = db.selectAllIDCode.all();

  expect(result).toStrictEqual([
    { idCode: 'gCaHD@aIj`@' },
    { idCode: 'gJQDD@`pBSMT@qB`@' },
    { idCode: 'gJQDL@aPBTuT@qD`@' },
  ]);
});
