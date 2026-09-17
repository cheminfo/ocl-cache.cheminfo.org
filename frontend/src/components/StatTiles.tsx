import { formatInteger } from 'react-cheminfo/core';

import type { CacheStats } from '../api/types.ts';

/** What the tile row needs. */
export interface StatTilesProps {
  /** Molecules cached right now — the one live figure. */
  total: number;
  /** The rollup, or null when none has run. */
  stats: CacheStats | null;
}

/**
 * The headline figures, as a row of tiles.
 *
 * `total` is current; everything drawn from the rollup is as old as the pass
 * that wrote it, which the page says above.
 * @param props - The live total and the rollup.
 * @returns The tiles.
 */
export function StatTiles(props: StatTilesProps) {
  const { total, stats } = props;

  const tiles = [
    { label: 'Molecules cached', value: formatInteger(total), note: 'live' },
    {
      label: 'Distinct structures',
      value: stats === null ? '—' : formatInteger(stats.distinctNoStereoID),
      note: 'stereochemistry dropped',
    },
    {
      label: 'Distinct skeletons',
      value:
        stats === null ? '—' : formatInteger(stats.distinctNoStereoTautomerID),
      note: 'stereochemistry and tautomerism dropped',
    },
    {
      label: 'Average weight',
      value:
        stats?.mass.mean == null ? '—' : `${stats.mass.mean.toFixed(1)} g/mol`,
      note:
        stats?.mass.min == null || stats.mass.max == null
          ? ''
          : `${stats.mass.min.toFixed(0)} to ${stats.mass.max.toFixed(0)}`,
    },
    {
      label: 'Rule of five',
      value:
        stats === null
          ? '—'
          : percent(stats.lipinski.pass, stats.lipinski.judged),
      note: 'pass, of those that could be judged',
    },
    {
      label: 'Tautomer id failed',
      value:
        stats === null ? '—' : percent(stats.failedTautomerID, stats.total),
      note: 'the no-stereo id is used instead',
    },
  ];

  return (
    <div className="stat-tiles" data-testid="stat-tiles">
      {tiles.map((tile) => (
        <div key={tile.label} className="stat-tile">
          <span className="stat-tile__value">{tile.value}</span>
          <span className="stat-tile__label">{tile.label}</span>
          {tile.note !== '' && (
            <span className="stat-tile__note">{tile.note}</span>
          )}
        </div>
      ))}
    </div>
  );
}

function percent(part: number, whole: number): string {
  if (whole === 0) return '—';
  return `${((part / whole) * 100).toFixed(1)}%`;
}
