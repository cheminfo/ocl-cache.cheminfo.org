/**
 * The elements of a molecule, written as the formula's parts.
 * @param props - The element counts.
 * @param props.atoms - How many of each element.
 * @returns The list.
 */
export function AtomCounts(props: { atoms: Record<string, number> }) {
  const entries = Object.entries(props.atoms);
  if (entries.length === 0) return <>—</>;
  return (
    <span className="atom-counts">
      {entries.map(([symbol, count]) => (
        <span key={symbol} className="atom-counts__item">
          {symbol}
          <span className="atom-counts__count">{count}</span>
        </span>
      ))}
    </span>
  );
}
