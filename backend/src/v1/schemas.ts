import { Type } from '@sinclair/typebox';

/** Molecule information, as every lookup route returns it. */
export const MoleculeInfoSchema = Type.Object(
  {
    mf: Type.String({ description: 'Molecular formula' }),
    mw: Type.Number({ description: 'Molecular weight' }),
    em: Type.Number({ description: 'Monoisotopic mass' }),
    charge: Type.Number({ description: 'Net charge' }),
    idCode: Type.String({ description: 'OCL idCode' }),
    noStereoID: Type.String({ description: 'idCode without stereochemistry' }),
    noStereoTautomerID: Type.String({
      description: 'idCode without stereochemistry nor tautomerism',
    }),
    failedTautomerID: Type.Number({
      description: '1 when the tautomer canonicalisation gave up',
    }),
    ssIndex: Type.Array(Type.Number(), {
      description: 'Substructure feature index, sixteen 32-bit words',
    }),
    logS: Type.Number(),
    logP: Type.Number(),
    acceptorCount: Type.Number(),
    donorCount: Type.Number(),
    stereoCenterCount: Type.Number(),
    rotatableBondCount: Type.Number(),
    polarSurfaceArea: Type.Number(),
    nbFragments: Type.Number(),
    unsaturation: Type.Optional(Type.Number()),
    atoms: Type.Record(Type.String(), Type.Number(), {
      description: 'Element counts',
    }),
    createdAt: Type.Union([Type.Number(), Type.Null()], {
      description:
        'When the molecule was cached, in unix seconds; null for one cached before the date was recorded',
    }),
  },
  { additionalProperties: false },
);

/**
 * What the three original routes answer.
 *
 * `result` is an empty object when the molecule could not be read, which is
 * the shape those routes have always returned; `log` then says why.
 */
export const LookupResponseSchema = Type.Object({
  result: Type.Union([
    MoleculeInfoSchema,
    Type.Object({}, { additionalProperties: false }),
  ]),
  cached: Type.Optional(
    Type.Boolean({
      description: 'Whether it was already cached rather than computed now',
    }),
  ),
  log: Type.Optional(Type.String()),
});

/** The notations a query may be written in. */
export const QueryKindSchema = Type.Optional(
  Type.Union(
    [Type.Literal('smiles'), Type.Literal('molfile'), Type.Literal('idCode')],
    {
      description:
        'How to read the query. Left out, the three are told apart automatically.',
    },
  ),
);

/** What `/v1/lookup` answers. */
export const CacheLookupResponseSchema = Type.Object({
  /** Null when the molecule is not cached and `cacheOnly` forbade computing it. */
  result: Type.Union([MoleculeInfoSchema, Type.Null()]),
  cached: Type.Boolean({
    description: 'Whether it was already cached rather than computed now',
  }),
  kind: Type.String({ description: 'How the query was read' }),
});
