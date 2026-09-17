import { chartSeriesColor, formatInteger } from 'react-cheminfo/core';

import type { CountBar } from './countBars.ts';

/** What the column chart needs. */
export interface ColumnChartProps {
  /** The heading over the chart. */
  title: string;
  /** What the labels under the columns are. */
  xLabel: string;
  /** The columns, in the order they are read. */
  bars: readonly CountBar[];
  /**
   * At most how many labels to write under the columns. Past it every nth is
   * written, so five years of months stay readable.
   * @default 14
   */
  maxLabels?: number;
  /**
   * Which colour of the family's chart palette to draw in.
   * @default 0
   */
  colorIndex?: number;
}

/**
 * A distribution over labelled categories: months, or a whole-number property.
 *
 * `TrackedStickChart` lays its measurements on a real number line, which is
 * right for a mass and wrong for a month: the axis then reads `-1.0 … 1.0`
 * where the labels should say `2026-09`, and a property every molecule shares
 * degenerates to a single point with nothing to scale against.
 * @param props - The heading, the labels and the columns.
 * @returns The chart.
 */
export function ColumnChart(props: ColumnChartProps) {
  const { title, xLabel, bars, maxLabels = 14, colorIndex = 0 } = props;

  let tallest = 0;
  for (const bar of bars) {
    if (bar.count > tallest) tallest = bar.count;
  }
  const every = Math.ceil(bars.length / maxLabels);

  return (
    <section className="chart-card">
      <h3 className="chart-card__title">{title}</h3>
      {bars.length === 0 ? (
        <p className="chart-card__empty">Nothing measured yet.</p>
      ) : (
        <>
          <div
            className="columns"
            role="img"
            aria-label={`${title}, by ${xLabel}`}
          >
            {bars.map((bar, index) => (
              <div className="columns__slot" key={bar.label}>
                <span className="columns__count">
                  {bar.count === 0 ? '' : formatInteger(bar.count)}
                </span>
                <span
                  className="columns__bar"
                  style={{
                    height: `${tallest === 0 ? 0 : (bar.count / tallest) * 100}%`,
                    background: chartSeriesColor(colorIndex),
                  }}
                  title={`${bar.label}: ${formatInteger(bar.count)}`}
                />
                <span className="columns__label">
                  {index % every === 0 ? bar.label : ''}
                </span>
              </div>
            ))}
          </div>
          <p className="chart-card__axis">{xLabel}</p>
        </>
      )}
    </section>
  );
}
