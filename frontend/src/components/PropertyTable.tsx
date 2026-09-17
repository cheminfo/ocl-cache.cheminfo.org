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
          {rows.map((row) => (
            <tr key={row.label}>
              <th scope="row">
                {row.label}
                {row.note !== undefined && (
                  <span className="property-table__note">{row.note}</span>
                )}
              </th>
              <td>{row.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
