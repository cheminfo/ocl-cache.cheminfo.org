import { expect, test } from 'vitest';

import { filterSql, readFilters } from '../../search/propertyFilter.ts';

test('a bound becomes a named parameter, never an interpolated value', () => {
  const sql = filterSql(readFilters({ mwMin: '100', mwMax: '250.5' }));

  expect(sql.where).toBe('mw >= :mwMin AND mw <= :mwMax');
  expect(sql.params).toStrictEqual({ mwMin: 100, mwMax: 250.5 });
  expect(sql.isEmpty).toBe(false);
});

test('several filters are combined, and a formula is matched exactly', () => {
  const sql = filterSql(
    readFilters({ logPMin: '0', donorsMax: '5', mf: 'C6H6' }),
  );

  expect(sql.where).toBe(
    'logP >= :logPMin AND donorCount <= :donorsMax AND mf = :mf',
  );
  expect(sql.params).toStrictEqual({ logPMin: 0, donorsMax: 5, mf: 'C6H6' });
});

test('nothing filtered is a clause that matches everything', () => {
  const sql = filterSql(readFilters({}));

  expect(sql.where).toBe('1');
  expect(sql.params).toStrictEqual({});
  expect(sql.isEmpty).toBe(true);
});

test('a bound that is not a number is ignored, not refused', () => {
  // A link written before a filter was renamed, or edited by hand, still opens
  // — the same rule the share vocabulary follows.
  const sql = filterSql(
    readFilters({ mwMin: 'heavy', psaMax: '', unknownMin: '5', logSMax: '-2' }),
  );

  expect(sql.where).toBe('logS <= :logSMax');
  expect(sql.params).toStrictEqual({ logSMax: -2 });
});

test('a zero bound is kept, because zero is a real bound', () => {
  const sql = filterSql(readFilters({ chargeMin: '0', chargeMax: '0' }));

  expect(sql.params).toStrictEqual({ chargeMin: 0, chargeMax: 0 });
});
