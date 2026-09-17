import type { MonthCount } from './types.ts';

/**
 * Put back the months nothing arrived in.
 *
 * The scan only counts months that have molecules, and a chart drawn from
 * those alone stands a quiet month next to a busy one as though no time passed
 * between them. A month with no molecules is a measurement, so it is written
 * with a count of zero.
 * @param counted - the months that have molecules, oldest first
 * @returns every month from the first to the last, none missing
 */
export function fillMonthGaps(counted: readonly MonthCount[]): MonthCount[] {
  const first = counted[0];
  const last = counted.at(-1);
  if (first === undefined || last === undefined) return [];

  const known = new Map(counted.map((entry) => [entry.month, entry.count]));
  const filled: MonthCount[] = [];
  for (let month = first.month; ; month = nextMonth(month)) {
    filled.push({ month, count: known.get(month) ?? 0 });
    if (month === last.month) break;
  }
  return filled;
}

/**
 * The month after this one.
 * @param month - a month written `YYYY-MM`
 * @returns the next month, in the same form
 */
function nextMonth(month: string): string {
  const year = Number(month.slice(0, 4));
  const index = Number(month.slice(5, 7));
  return index === 12
    ? `${year + 1}-01`
    : `${year}-${String(index + 1).padStart(2, '0')}`;
}
