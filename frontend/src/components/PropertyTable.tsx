import { ClickToCopy } from 'react-cheminfo/ui';

import { copyableText } from './copyableValue.ts';
import type { Property } from './propertyRows.tsx';

/** What the property table needs. */
export interface PropertyTableProps {
  /** The heading over this group. */
  title: string;
  /** The rows, in the order they are read. */
  rows: readonly Property[];
}

/**
 * One group of properties, as a two-column table.
 *
 * Every value is its own copy target, so a mass, a formula or an idCode is
 * taken away with one click; a row the cache holds no value for is drawn as a
 * plain cell.
 * @param props - The heading and the rows.
 * @returns The table.
 */
export function PropertyTable(props: PropertyTableProps) {
  const { title, rows } = props;
  return (
    <section className="property-group">
      <h3 className="property-group__title">{title}</h3>
      <table className="property-table">
        <tbody>
          {rows.map((row) => {
            const copy = row.copy ?? copyableText(row.value);
            return (
              <tr key={row.label}>
                <th scope="row">
                  {row.label}
                  {row.note !== undefined && (
                    <span className="property-table__note">{row.note}</span>
                  )}
                </th>
                <ClickToCopy
                  as="td"
                  value={copy ?? ''}
                  label={row.label}
                  disabled={copy === null}
                >
                  {row.value}
                </ClickToCopy>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
