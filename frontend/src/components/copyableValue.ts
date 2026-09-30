import type { ReactNode } from 'react';

/** What a cell shows when the cache holds no value for it. */
const NOT_AVAILABLE = '—';

/**
 * The text a reader pastes for a value the page shows, or `null` when there is
 * nothing to take: a value the cache does not hold, or one drawn from elements
 * rather than written as text, which names its own copy text instead.
 * @param value - What is on screen.
 * @returns The clipboard text, or null.
 */
export function copyableText(value: ReactNode): string | null {
  if (typeof value === 'number') return String(value);
  if (typeof value !== 'string') return null;
  const text = value.trim();
  return text === '' || text === NOT_AVAILABLE ? null : text;
}

/**
 * The atom counts of a molecule as one line of text, which is what a click on
 * them copies — they are drawn as elements, so there is no text to read back.
 * @param atoms - How many of each element.
 * @returns The line, or undefined when there is no atom to write.
 */
export function atomCountsText(
  atoms: Record<string, number>,
): string | undefined {
  const entries = Object.entries(atoms);
  if (entries.length === 0) return undefined;
  return entries.map(([symbol, count]) => `${symbol}${count}`).join(' ');
}
