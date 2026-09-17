import { formatInteger } from 'react-cheminfo/core';

import type { CacheStats } from '../api/types.ts';

/** What the two lists need. */
export interface ElementTableProps {
  /** The rollup the lists are read from. */
  stats: CacheStats;
}

/**
 * Which elements the cache contains, and which formulas repeat most.
 *
 * Both are counts of molecules, not of atoms: an element is counted once per
 * molecule that contains it however many times it appears.
 * @param props - The rollup.
 * @returns The two lists, side by side.
 */
export function ElementTable(props: ElementTableProps) {
  const { stats } = props;
  const elements = stats.elements.slice(0, 20);
  const widest = elements[0]?.molecules ?? 1;

  return (
    <div className="lists">
      <section className="list-card">
        <h3 className="list-card__title">Elements</h3>
        <p className="list-card__note">
          How many molecules contain each, of {formatInteger(stats.total)}.
        </p>
        <ul className="bar-list">
          {elements.map((element) => (
            <li key={element.symbol} className="bar-list__row">
              <span className="bar-list__key">{element.symbol}</span>
              <span className="bar-list__track">
                <span
                  className="bar-list__fill"
                  style={{ width: `${(element.molecules / widest) * 100}%` }}
                />
              </span>
              <span className="bar-list__value">
                {formatInteger(element.molecules)}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="list-card">
        <h3 className="list-card__title">Commonest formulas</h3>
        <p className="list-card__note">
          One formula covers many structures: isomers share it.
        </p>
        <ul className="bar-list">
          {stats.topFormulas.map((formula) => (
            <li key={formula.mf} className="bar-list__row">
              <span className="bar-list__key bar-list__key--wide">
                <code>{formula.mf}</code>
              </span>
              <span className="bar-list__value">
                {formatInteger(formula.count)}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
