import { deserialize } from 'bson';

/**
 * Read the elements of one molecule out of its stored BSON document.
 * @param atoms - the serialised `{ symbol: count }` document
 * @returns the element symbols, or an empty array when it cannot be read
 */
export function elementsOf(atoms: Uint8Array | null): string[] {
  if (atoms === null || atoms.length === 0) return [];
  try {
    return Object.keys(deserialize(atoms));
  } catch {
    // A row whose blob cannot be read still counts everywhere else.
    return [];
  }
}
