import { MF } from 'react-mf';

import type { MoleculeInfo } from '../api/types.ts';

import { AtomCounts } from './AtomCounts.tsx';

/** One property, as the table writes it. */
export interface Property {
  /** What the row is called. */
  label: string;
  /** The value, already formatted. */
  value: React.ReactNode;
  /**
   * What the number means, when the name alone does not say.
   * @default undefined
   */
  note?: string;
}

/**
 * The formula and mass group.
 * @param info - The molecule.
 * @returns The rows.
 */
export function compositionRows(info: MoleculeInfo): Property[] {
  return [
    { label: 'Molecular formula', value: <MF mf={info.mf} /> },
    {
      label: 'Monoisotopic mass',
      value: decimal(info.em, 4),
      note: 'em',
    },
    { label: 'Molecular weight', value: decimal(info.mw, 3), note: 'mw' },
    { label: 'Charge', value: integer(info.charge) },
    {
      label: 'Unsaturation',
      value:
        info.unsaturation === undefined ? '—' : decimal(info.unsaturation, 1),
      note: 'degree',
    },
    {
      label: 'Fragments',
      value: integer(info.nbFragments),
      note: 'disconnected parts',
    },
    { label: 'Atoms', value: <AtomCounts atoms={info.atoms} /> },
  ];
}

/**
 * The predicted-property group: the numbers OpenChemLib estimates.
 * @param info - The molecule.
 * @returns The rows.
 */
export function predictedRows(info: MoleculeInfo): Property[] {
  return [
    { label: 'logP', value: decimal(info.logP, 2), note: 'predicted' },
    { label: 'logS', value: decimal(info.logS, 2), note: 'predicted' },
    {
      label: 'Polar surface area',
      value: decimal(info.polarSurfaceArea, 1),
      note: 'Å²',
    },
    { label: 'H-bond donors', value: integer(info.donorCount) },
    { label: 'H-bond acceptors', value: integer(info.acceptorCount) },
    { label: 'Rotatable bonds', value: integer(info.rotatableBondCount) },
    { label: 'Stereocentres', value: integer(info.stereoCenterCount) },
  ];
}

/**
 * The identifier group: the idCode, and the two canonical forms the cache
 * groups molecules by.
 * @param info - The molecule.
 * @returns The rows.
 */
export function identifierRows(info: MoleculeInfo): Property[] {
  return [
    { label: 'idCode', value: <code>{info.idCode}</code> },
    {
      label: 'No stereo',
      value: <code>{info.noStereoID}</code>,
      note: 'stereochemistry dropped',
    },
    {
      label: 'No stereo, no tautomer',
      value: <code>{info.noStereoTautomerID}</code>,
      note:
        info.failedTautomerID === 1
          ? 'canonicalisation gave up — the no-stereo id is repeated'
          : 'stereochemistry and tautomerism dropped',
    },
  ];
}

function decimal(value: number, digits: number): string {
  return Number.isFinite(value) ? value.toFixed(digits) : '—';
}

function integer(value: number): string {
  return Number.isFinite(value) ? String(value) : '—';
}
