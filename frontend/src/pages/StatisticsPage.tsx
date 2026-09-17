import { Callout, Spinner } from '@blueprintjs/core';
import { useEffect, useState } from 'react';
import { formatInteger } from 'react-cheminfo/core';

import { fetchStats } from '../api/client.ts';
import type { StatsResponse } from '../api/types.ts';
import { ColumnChart } from '../components/ColumnChart.tsx';
import { CountChart } from '../components/CountChart.tsx';
import { ElementTable } from '../components/ElementTable.tsx';
import { StatTiles } from '../components/StatTiles.tsx';
import { barsOfHistogram, barsOfValues } from '../components/countBars.ts';

/**
 * What the whole database holds.
 *
 * Every figure but the molecule count comes from a pass that runs on a
 * schedule, so the page says when it ran rather than implying the numbers are
 * current.
 * @returns The statistics page.
 */
export function StatisticsPage() {
  const [data, setData] = useState<StatsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetchStats(controller.signal)
      .then(setData)
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setError(error instanceof Error ? error.message : 'the figures failed');
      });
    return () => controller.abort();
  }, []);

  if (error !== null) {
    return (
      <div className="page">
        <Callout intent="danger" icon="error" title="That did not work">
          {error}
        </Callout>
      </div>
    );
  }

  if (data === null) {
    return (
      <div className="page page__loading">
        <Spinner size={28} />
      </div>
    );
  }

  const stats = data.snapshot?.stats ?? null;

  return (
    <div className="page page--statistics">
      <StatTiles total={data.total} stats={stats} />

      {data.snapshot === null ? (
        <Callout intent="primary" icon="time">
          The figures have not been computed yet. They come from a pass that
          runs on a schedule; until it has, only the molecule count is known.
        </Callout>
      ) : (
        <>
          <p className="page__note">
            Computed {ago(data.snapshot.computedAt)} over{' '}
            {formatInteger(data.snapshot.scanned)} molecules, in{' '}
            {(data.snapshot.durationMs / 1000).toFixed(1)} s.
          </p>
          {stats !== null && <Figures stats={stats} />}
        </>
      )}
    </div>
  );
}

/**
 * Every chart the rollup can draw.
 * @param props - The rollup.
 * @param props.stats - The figures to draw.
 * @returns The charts and the lists.
 */
function Figures(props: {
  stats: NonNullable<StatsResponse['snapshot']>['stats'];
}) {
  const { stats } = props;

  return (
    <>
      <MonthlyIntake stats={stats} />

      <div className="charts">
        <CountChart
          title="Molecular weight"
          xLabel="g/mol"
          bars={barsOfHistogram(stats.histograms.mw)}
          colorIndex={0}
        />
        <CountChart
          title="logP"
          xLabel="predicted logP"
          bars={barsOfHistogram(stats.histograms.logP)}
          colorIndex={1}
        />
        <CountChart
          title="logS"
          xLabel="predicted logS"
          bars={barsOfHistogram(stats.histograms.logS)}
          colorIndex={2}
        />
        <CountChart
          title="Polar surface area"
          xLabel="Å²"
          bars={barsOfHistogram(stats.histograms.polarSurfaceArea)}
          colorIndex={3}
        />
        <ColumnChart
          title="Rotatable bonds"
          xLabel="bonds"
          bars={barsOfValues(stats.counts.rotatableBondCount)}
          colorIndex={4}
        />
        <ColumnChart
          title="Stereocentres"
          xLabel="centres"
          bars={barsOfValues(stats.counts.stereoCenterCount)}
          colorIndex={5}
        />
        <ColumnChart
          title="H-bond donors"
          xLabel="donors"
          bars={barsOfValues(stats.counts.donorCount)}
          colorIndex={6}
        />
        <ColumnChart
          title="H-bond acceptors"
          xLabel="acceptors"
          bars={barsOfValues(stats.counts.acceptorCount)}
          colorIndex={7}
        />
        <ColumnChart
          title="Charge"
          xLabel="net charge"
          bars={barsOfValues(stats.counts.charge)}
          colorIndex={8}
        />
        <ColumnChart
          title="Fragments"
          xLabel="disconnected parts"
          bars={barsOfValues(stats.counts.nbFragments)}
          colorIndex={9}
        />
      </div>

      <ElementTable stats={stats} />
    </>
  );
}

/**
 * How many molecules arrived each month.
 *
 * Molecules cached before the date was recorded are counted beside the chart
 * rather than folded into a month they may not belong to.
 * @param props - The rollup.
 * @param props.stats - The figures to draw.
 * @returns The chart, with a note on the undated molecules.
 */
function MonthlyIntake(props: {
  stats: NonNullable<StatsResponse['snapshot']>['stats'];
}) {
  const { stats } = props;
  const bars = stats.perMonth.map((entry, index) => ({
    position: index,
    label: entry.month,
    count: entry.count,
  }));

  return (
    <section className="monthly">
      <ColumnChart
        title="Molecules cached per month"
        xLabel="month"
        bars={bars}
        maxLabels={18}
      />
      {stats.undated > 0 && (
        <Callout icon="history" className="monthly__note">
          {stats.undated === 1
            ? 'One molecule was'
            : `${formatInteger(stats.undated)} molecules were`}{' '}
          cached before the date was recorded, so they are not in the chart.
          Everything cached since carries its date.
        </Callout>
      )}
    </section>
  );
}

/**
 * How long ago a moment was, in words.
 * @param unixSeconds - the moment
 * @returns a phrase like "2 hours ago"
 */
function ago(unixSeconds: number): string {
  const seconds = Math.max(0, Math.floor(Date.now() / 1000 - unixSeconds));
  if (seconds < 90) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 90) return `${minutes} minutes ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 36) return `${hours} hours ago`;
  return `${Math.round(hours / 24)} days ago`;
}
