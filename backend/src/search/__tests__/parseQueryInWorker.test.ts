import { expect, test } from 'vitest';

import { parseQueryInWorker } from '../parseQueryInWorker.ts';

test('reads a SMILES into its idCode', async () => {
  await expect(parseQueryInWorker('CCOCC')).resolves.toStrictEqual({
    idCode: 'gJQ@@eKU@@',
    kind: 'smiles',
  });
});

test('recognises an idCode as one, rather than reading it as a SMILES', async () => {
  await expect(parseQueryInWorker('gJQ@@eKU@@')).resolves.toStrictEqual({
    idCode: 'gJQ@@eKU@@',
    kind: 'idCode',
  });
});

test('reads a molfile', async () => {
  const molfile = `
  Mrv  

  3  2  0  0  0  0            999 V2000
    0.0000    0.0000    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
    0.8250    0.4763    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
    1.6500    0.0000    0.0000 C   0  0  0  0  0  0  0  0  0  0  0  0
  1  2  1  0  0  0  0
  2  3  1  0  0  0  0
M  END`;

  await expect(parseQueryInWorker(molfile)).resolves.toStrictEqual({
    idCode: 'eM@Hz@',
    kind: 'molfile',
  });
});

test('a declared notation is used rather than guessed at', async () => {
  const { kind } = await parseQueryInWorker('CCC', 'smiles');
  expect(kind).toBe('smiles');
});

test('a query that is not a molecule rejects', async () => {
  await expect(parseQueryInWorker('')).rejects.toThrow('the query is empty');
});
