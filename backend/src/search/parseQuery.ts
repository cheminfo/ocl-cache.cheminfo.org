import { Molecule } from 'openchemlib';

/** How a query string is read. */
export type QueryKind = 'smiles' | 'molfile' | 'idCode';

/** A query string, read into a molecule. */
export interface ParsedQuery {
  /** The molecule the string described. */
  molecule: Molecule;
  /** How the string turned out to be written. */
  kind: QueryKind;
}

/**
 * Read a query written as SMILES, as a molfile, or as an OCL idCode.
 *
 * With no `kind` the three are told apart rather than guessed at: a molfile
 * announces itself with its counts line, and an idCode is canonical, so a
 * string is one exactly when parsing it and writing it back gives the same
 * characters. Anything else is read as SMILES.
 * @param input - the query as the caller typed it
 * @param kind - the notation, when the caller already knows it
 * @returns the molecule and the notation it was written in
 * @throws {Error} When the string is not a molecule in any of the three.
 */
export function parseQuery(input: string, kind?: QueryKind): ParsedQuery {
  const text = input.trim();
  if (text === '') throw new Error('the query is empty');

  // A molfile's first line is its title, and it is normally blank. Trimming it
  // away shifts every line up by one, so the counts line lands where the
  // header is read and OCL returns an empty molecule. Only the trailing
  // whitespace is safe to drop.
  const molfile = input.replace(/\s+$/, '');

  if (kind !== undefined) {
    return {
      molecule: parseAs(kind === 'molfile' ? molfile : text, kind),
      kind,
    };
  }

  if (looksLikeMolfile(text)) {
    return { molecule: parseAs(molfile, 'molfile'), kind: 'molfile' };
  }

  const fromIDCode = tryIDCode(text);
  if (fromIDCode !== null) return { molecule: fromIDCode, kind: 'idCode' };

  return { molecule: parseAs(text, 'smiles'), kind: 'smiles' };
}

/**
 * Read a string known to be written in one notation.
 * @param text - the trimmed query
 * @param kind - the notation it is written in
 * @returns the molecule
 */
function parseAs(text: string, kind: QueryKind): Molecule {
  switch (kind) {
    case 'molfile':
      return Molecule.fromMolfile(text);
    case 'idCode':
      return Molecule.fromIDCode(text);
    case 'smiles':
      return Molecule.fromSmiles(text);
    // no default
  }
}

/**
 * Whether a string carries the shape of a molfile.
 * @param text - the trimmed query
 * @returns true when it has several lines and names a molfile version
 */
function looksLikeMolfile(text: string): boolean {
  return text.includes('\n') && /V[23]000/.test(text);
}

/**
 * Read a string as an idCode, accepting it only when it writes itself back.
 *
 * An idCode is canonical, so this rejects a SMILES that happens to parse.
 * @param text - the trimmed query
 * @returns the molecule, or null when the string is not an idCode
 */
function tryIDCode(text: string): Molecule | null {
  try {
    const molecule = Molecule.fromIDCode(text);
    return molecule.getIDCode() === text ? molecule : null;
  } catch {
    return null;
  }
}
