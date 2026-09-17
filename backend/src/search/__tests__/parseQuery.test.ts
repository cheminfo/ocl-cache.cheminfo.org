import { Molecule } from 'openchemlib';
import { expect, test } from 'vitest';

import { parseQuery } from '../parseQuery.ts';

test('a SMILES is read as one', () => {
  const parsed = parseQuery('CCO');

  expect(parsed.kind).toBe('smiles');
  expect(parsed.molecule.getIDCode()).toBe('eMHAIh@');
});

test('an idCode is told from a SMILES by writing itself back', () => {
  const idCode = Molecule.fromSmiles('CC(=O)Oc1ccccc1C(=O)O').getIDCode();

  const parsed = parseQuery(idCode);

  expect(parsed.kind).toBe('idCode');
  expect(parsed.molecule.getIDCode()).toBe(idCode);
});

test('a molfile announces itself with its version line', () => {
  const molecule = Molecule.fromSmiles('CCO');
  // A molecule read from SMILES carries no coordinates, and a molfile without
  // them describes nothing.
  molecule.inventCoordinates();
  const molfile = molecule.toMolfile();

  const parsed = parseQuery(molfile);

  expect(parsed.kind).toBe('molfile');
  expect(parsed.molecule.getIDCode()).toBe('eMHAIh@');
  expect(parsed.molecule.getAllAtoms()).toBe(3);
});

test('a molfile keeps its blank title line, which trimming would eat', () => {
  const molecule = Molecule.fromSmiles('CCO');
  molecule.inventCoordinates();

  // Trailing whitespace is dropped, the leading blank line is not: without it
  // every line shifts up and OCL reads an empty molecule.
  const parsed = parseQuery(`${molecule.toMolfile()}\n\n  `);

  expect(parsed.molecule.getAllAtoms()).toBe(3);
});

test('a caller who knows the notation is believed', () => {
  const parsed = parseQuery('CCO', 'smiles');

  expect(parsed.kind).toBe('smiles');
});

test('an empty query is refused', () => {
  expect(() => parseQuery(' '.repeat(3))).toThrow('the query is empty');
});

test('a string that is no molecule at all is refused', () => {
  expect(() => parseQuery('not a molecule!!!')).toThrow();
});
