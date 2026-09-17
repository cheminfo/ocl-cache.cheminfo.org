import type { StatsScanRow } from '../db/rows.ts';

import { elementsOf } from './elementsOf.ts';
import { Histogram, ValueCounter } from './histogram.ts';
import type { CacheStats, ElementCount } from './types.ts';

/** Lipinski's thresholds, and the number of breaches the rule tolerates. */
const LIPINSKI = { mw: 500, logP: 5, donors: 5, acceptors: 10, allowed: 1 };

/**
 * Everything one pass over `molecules` adds up, kept in one object so the scan
 * stays a loop and the shapes of the buckets are declared in a single place.
 */
export class Accumulators {
  readonly #mw = new Histogram(0, 1200, 25);
  readonly #logP = new Histogram(-10, 12, 0.5);
  readonly #logS = new Histogram(-14, 4, 0.5);
  readonly #psa = new Histogram(0, 320, 10);

  readonly #charge = new ValueCounter(-6, 6);
  readonly #nbFragments = new ValueCounter(0, 12);
  readonly #stereoCenters = new ValueCounter(0, 20);
  readonly #rotatableBonds = new ValueCounter(0, 30);
  readonly #donors = new ValueCounter(0, 20);
  readonly #acceptors = new ValueCounter(0, 30);
  readonly #unsaturation = new ValueCounter(0, 30);

  readonly #elements = new Map<string, number>();

  #total = 0;
  #dated = 0;
  #failedTautomer = 0;
  #massCounted = 0;
  #massSum = 0;
  #massMin: number | null = null;
  #massMax: number | null = null;
  #lipinskiJudged = 0;
  #lipinskiPass = 0;

  /**
   * Fold one molecule into every running total.
   * @param row - the columns the scan reads
   */
  add(row: StatsScanRow): void {
    this.#total++;
    if (row.createdAt !== null) this.#dated++;
    if (row.failedTautomerID) this.#failedTautomer++;

    if (row.mw !== null) {
      this.#mw.add(row.mw);
      this.#massCounted++;
      this.#massSum += row.mw;
      if (this.#massMin === null || row.mw < this.#massMin) {
        this.#massMin = row.mw;
      }
      if (this.#massMax === null || row.mw > this.#massMax) {
        this.#massMax = row.mw;
      }
    }
    if (row.logP !== null) this.#logP.add(row.logP);
    if (row.logS !== null) this.#logS.add(row.logS);
    if (row.polarSurfaceArea !== null) this.#psa.add(row.polarSurfaceArea);

    if (row.charge !== null) this.#charge.add(row.charge);
    if (row.nbFragments !== null) this.#nbFragments.add(row.nbFragments);
    if (row.stereoCenterCount !== null) {
      this.#stereoCenters.add(row.stereoCenterCount);
    }
    if (row.rotatableBondCount !== null) {
      this.#rotatableBonds.add(row.rotatableBondCount);
    }
    if (row.donorCount !== null) this.#donors.add(row.donorCount);
    if (row.acceptorCount !== null) this.#acceptors.add(row.acceptorCount);
    if (row.unsaturation !== null) this.#unsaturation.add(row.unsaturation);

    this.#addLipinski(row);

    for (const symbol of elementsOf(row.atoms)) {
      this.#elements.set(symbol, (this.#elements.get(symbol) ?? 0) + 1);
    }
  }

  /**
   * The figures this pass can answer on its own.
   * @returns every field but the ones SQLite computes
   */
  toStats(): Omit<
    CacheStats,
    | 'distinctNoStereoID'
    | 'distinctNoStereoTautomerID'
    | 'perMonth'
    | 'topFormulas'
  > {
    return {
      total: this.#total,
      dated: this.#dated,
      undated: this.#total - this.#dated,
      failedTautomerID: this.#failedTautomer,
      histograms: {
        mw: this.#mw.toBuckets(),
        logP: this.#logP.toBuckets(),
        logS: this.#logS.toBuckets(),
        polarSurfaceArea: this.#psa.toBuckets(),
      },
      counts: {
        charge: this.#charge.toValueCounts(),
        nbFragments: this.#nbFragments.toValueCounts(),
        stereoCenterCount: this.#stereoCenters.toValueCounts(),
        rotatableBondCount: this.#rotatableBonds.toValueCounts(),
        donorCount: this.#donors.toValueCounts(),
        acceptorCount: this.#acceptors.toValueCounts(),
        unsaturation: this.#unsaturation.toValueCounts(),
      },
      elements: this.#elementCounts(),
      mass: {
        min: this.#massMin,
        max: this.#massMax,
        mean:
          this.#massCounted === 0 ? null : this.#massSum / this.#massCounted,
        counted: this.#massCounted,
      },
      lipinski: {
        pass: this.#lipinskiPass,
        fail: this.#lipinskiJudged - this.#lipinskiPass,
        judged: this.#lipinskiJudged,
      },
    };
  }

  #addLipinski(row: StatsScanRow): void {
    const { mw, logP, donorCount, acceptorCount } = row;
    if (
      mw === null ||
      logP === null ||
      donorCount === null ||
      acceptorCount === null
    ) {
      return;
    }
    this.#lipinskiJudged++;
    let breaches = 0;
    if (mw > LIPINSKI.mw) breaches++;
    if (logP > LIPINSKI.logP) breaches++;
    if (donorCount > LIPINSKI.donors) breaches++;
    if (acceptorCount > LIPINSKI.acceptors) breaches++;
    if (breaches <= LIPINSKI.allowed) this.#lipinskiPass++;
  }

  #elementCounts(): ElementCount[] {
    const counts: ElementCount[] = [];
    for (const [symbol, molecules] of this.#elements) {
      counts.push({ symbol, molecules });
    }
    counts.sort((one, other) => other.molecules - one.molecules);
    return counts;
  }
}
