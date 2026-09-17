import { useRef } from 'react';
import { chartSeriesColor } from 'react-cheminfo/core';
import { TrackedStickChart, useContainerSize } from 'react-cheminfo/ui';

import type { CountBar } from './countBars.ts';

/** What the chart needs. */
export interface CountChartProps {
  /** The heading over the chart. */
  title: string;
  /** What the horizontal axis measures. */
  xLabel: string;
  /** The bars, ascending by position. */
  bars: readonly CountBar[];
  /**
   * Which colour of the family's chart palette to draw in.
   * @default 0
   */
  colorIndex?: number;
  /**
   * Height of the plot, in pixels.
   * @default 190
   */
  height?: number;
}

/**
 * A distribution, drawn as the bars it is.
 *
 * `TrackedStickChart` from `react-cheminfo` does the drawing and the readout;
 * what belongs here is only turning bucket counts into the three arrays it
 * takes.
 * @param props - The heading, the axis and the bars.
 * @returns The chart.
 */
export function CountChart(props: CountChartProps) {
  const { title, xLabel, bars, colorIndex = 0, height = 190 } = props;
  const container = useRef<HTMLDivElement>(null);
  const { width } = useContainerSize(container);

  const positions = new Array<number>(bars.length);
  const categories = new Array<string>(bars.length);
  const values = new Float64Array(bars.length);
  for (let i = 0; i < bars.length; i++) {
    const bar = bars[i];
    if (bar === undefined) continue;
    positions[i] = bar.position;
    categories[i] = bar.label;
    values[i] = bar.count;
  }

  return (
    <section className="chart-card">
      <h3 className="chart-card__title">{title}</h3>
      <div className="chart-card__plot" ref={container}>
        {width > 0 && bars.length > 0 && (
          <TrackedStickChart
            positions={positions}
            categories={categories}
            series={[
              {
                id: title,
                label: 'molecules',
                values,
                color: chartSeriesColor(colorIndex),
              },
            ]}
            width={width}
            height={height}
            xLabel={xLabel}
          />
        )}
        {bars.length === 0 && (
          <p className="chart-card__empty">Nothing measured yet.</p>
        )}
      </div>
    </section>
  );
}
