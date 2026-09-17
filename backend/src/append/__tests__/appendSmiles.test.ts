import { expect, test } from 'vitest';

import { getTempDB } from '../../db/dbFactory.ts';
import { appendSmiles } from '../appendSmiles.ts';

test('appendSmiles', { timeout: 30000 }, async () => {
  const data = `C
CC
CCC`;
  const db = await getTempDB();
  await appendSmiles(data, db);

  const result = db.selectAllIDCode.all();

  expect(result).toStrictEqual([
    { idCode: 'eF@Hp@' },
    { idCode: 'eM@Hz@' },
    { idCode: 'fH@@' },
  ]);
});
